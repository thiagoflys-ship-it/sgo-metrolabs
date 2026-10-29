// Comercial nativo do SGO+ (21/10/2026): oportunidades, contatos, proposta, política de desconto, Caixa de decisões,
// documento A4 na pasta do cliente, resposta do cliente, passagem aos setores, a gestora comercial (regras e IA conferida)
// e a rotina. Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste, em, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };

function propostaPronta(amb, desconto) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Qualificação térmica (QI, QO e QD) da autoclave da CME, com relatório e certificados.', descontoPct: desconto || '',
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'A combinar', garantia: '90 dias' } }));
  return { oportunidade, proposta: np.proposta };
}

// ------------------------------------------------------------------ permissões e valores
test('permissões: técnico, metrologia e RH não abrem o Comercial; Financeiro só pedidos aprovados; vendedor só as próprias', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  for (const sid of ['s_tiago', 's_mara', 's_rita', 's_gil']) {
    const r = amb.api(sid, 'oportunidades');
    assert.equal(r.ok, false, sid + ' não pode ver oportunidades');
    assert.match(r.message, /Comercial é da equipe comercial/);
    assert.equal(amb.api(sid, 'iniciar').nivel, 'NENHUM');
    assert.equal(amb.api(sid, 'oportunidade', { id: oportunidade.id }).ok, false);
  }
  assert.equal(amb.api('s_fabio', 'iniciar').nivel, 'FINANCEIRO');
  assert.match(amb.api('s_fabio', 'oportunidades').message, /Financeiro vê só os pedidos aprovados/);
  assert.equal(ok(amb.api('s_fabio', 'propostas')).propostas.length, 0);
  assert.equal(ok(amb.api('s_vito', 'oportunidades')).oportunidades.length, 0, 'outro vendedor não vê a oportunidade da Vera');
  assert.match(amb.api('s_vito', 'oportunidade', { id: oportunidade.id }).message, /é de VERA VENDEDORA TESTE/);
  assert.equal(ok(amb.api('s_gaspar', 'oportunidades')).oportunidades.length, 1, 'gestor com área Comercial vê a equipe');
  assert.equal(ok(amb.api('s_dora', 'oportunidades')).oportunidades.length, 1, 'Diretoria vê');
  // o próprio objeto da tela do Financeiro e da vendedora: custo só para a gestão
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'QT-AC', nome: 'Qualificação térmica de autoclave', tipo: 'SERVICO', preco: '5.000,00', custo: '2.000,00' }));
  assert.equal(ok(amb.api('s_vera', 'catalogo')).produtos[0].custo, undefined, 'vendedor não vê custo');
  assert.equal(ok(amb.api('s_gaspar', 'catalogo')).produtos[0].custo, 2000);
  // 29/10/2026 (pedido do dono): o vendedor mantém o catálogo com limites (sem custo); detalhes em comercial-catalogo-equipe-exclusao.test.cjs
  assert.equal(amb.api('s_vera', 'salvarProduto', { codigo: 'X', nome: 'Teste', preco: 1, custo: '0,50' }).ok, false, 'vendedor não informa custo');
  assert.equal(amb.api('s_vera', 'salvarProduto', { codigo: 'X', nome: 'Teste', preco: 1 }).ok, true, 'vendedor cadastra item sem custo');
  assert.equal(amb.api('s_tiago', 'salvarProduto', { codigo: 'Y', nome: 'Teste técnico', preco: 1 }).ok, false, 'técnico não mantém catálogo');
});

test('valores nunca saem do Comercial: atividades, avisos e pendências sem R$', () => {
  const amb = ambiente();
  const { proposta } = propostaPronta(amb, '20');
  ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id, justificativa: 'Cliente com três concorrentes na disputa' }));
  ok(amb.api('s_gaspar', 'decidirDesconto', { id: proposta.id, aprovar: true, texto: 'Contrato anual em vista; aprovado' }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: proposta.id }));
  amb.tabelas.DOC_ENVIOS.push({ ID: 'e1', ARQUIVO_ID: g.pdfId, SITUACAO: 'ENVIADO', CANAL: 'EMAIL', DESTINO: 'ana@alfa.exemplo.test', USUARIO_ID: 'u_ven', USUARIO_NOME: 'VERA', QUANDO: '2026-10-19T10:30:00' });
  ok(amb.api('s_vera', 'proposta', { id: proposta.id }));
  ok(amb.api('s_vera', 'respostaCliente', { id: proposta.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', arquivo: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') } }));
  ok(amb.api('s_vera', 'passarSetores', { id: proposta.id }));
  const textos = amb.tabelas.ATV_ATIVIDADES.map((a) => a.TITULO + ' ' + a.DESCRICAO + ' ' + (a.QUANTO || '')).concat(amb.tabelas.COM_AVISOS.map((v) => v.TITULO + ' ' + v.TEXTO));
  textos.forEach((t) => assert.doesNotMatch(t, /R\$\s?\d/, 'sem valor: ' + t.slice(0, 120)));
  const pend = amb.ctx.SGO_Pendencias_listar('s_gaspar', { semCache: true }).itens;
  pend.forEach((i) => assert.doesNotMatch(i.titulo + i.detalhe, /R\$\s?\d/));
  // atividade da técnica: sem valor e no Kanban do Cronograma; a do Financeiro aponta para Pedidos aprovados
  const tec = amb.tabelas.ATV_ATIVIDADES.find((a) => /Área técnica/.test(a.TITULO));
  assert.equal(tec.MODULO, 'cronograma_execucao');
  assert.equal(tec.RESPONSAVEL_ID, 'u_gt', 'gestor da área técnica no cadastro');
  const fin = amb.tabelas.ATV_ATIVIDADES.find((a) => /Financeiro/.test(a.TITULO));
  assert.equal(fin.RESPONSAVEL_ID, 'u_fin');
  assert.match(fin.DESCRICAO, /Comercial > Pedidos aprovados/);
  // o Financeiro vê o valor só na tela dele
  const ped = ok(amb.api('s_fabio', 'pedidos')).pedidos;
  assert.equal(ped.length, 1);
  assert.equal(ped[0].totalTxt, 'R$ 3.600,00');
  assert.equal(ped[0].faturamento.cnpj, '11.222.333/0001-81');
});

// ------------------------------------------------------------------ numeração
test('numeração: PROP-2026-0001 em diante; revisão mantém o número e marca a anterior como substituída; OPO-2026-0001', () => {
  const amb = ambiente();
  const a = propostaPronta(amb);
  assert.equal(a.proposta.numero, 'PROP-2026-0001');
  assert.equal(a.proposta.revisao, '00');
  assert.equal(a.oportunidade.codigo, 'OPO-2026-0001');
  ok(amb.api('s_vera', 'concluirProposta', { id: a.proposta.id }));
  const rev = ok(amb.api('s_vera', 'novaRevisao', { id: a.proposta.id }));
  assert.equal(rev.proposta.numero, 'PROP-2026-0001');
  assert.equal(rev.proposta.revisao, '01');
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((p) => p.ID === a.proposta.id).SITUACAO, 'SUBSTITUIDA');
  assert.equal(amb.api('s_vera', 'novaRevisao', { id: a.proposta.id }).ok, false, 'só uma revisão em rascunho');
  // segunda oportunidade, segunda proposta: número seguinte (o maior gravado vale mesmo se a sequência sumir)
  delete amb.props.COM_SEQ_PROP_2026;
  const ct = amb.tabelas.CAD_CONTATOS[amb.tabelas.CAD_CONTATOS.length - 1];
  const o2 = ok(amb.api('s_vera', 'salvarOportunidade', { titulo: 'Calibração de instrumentos', clienteId: 'c1', unidadeId: 'un1', contatoId: ct.ID, funil: 'ENGENHARIA', origem: 'Indicação', valor: '1.000', proxima: { acao: 'Ligar para confirmar', data: '2026-10-21' } }));
  assert.equal(o2.oportunidade.codigo, 'OPO-2026-0002');
  assert.equal(ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: o2.oportunidade.id })).proposta.numero, 'PROP-2026-0002');
});

// ------------------------------------------------------------------ desconto e Caixa
test('desconto acima do limite: vai para a Caixa de decisões do gestor comercial e não sai até a decisão; quem pediu não aprova', () => {
  const amb = ambiente();
  const { proposta } = propostaPronta(amb, '20');
  const c1 = amb.api('s_vera', 'concluirProposta', { id: proposta.id });
  assert.equal(c1.ok, false);
  assert.match(c1.message, /20,0% acima do limite de 15%/);
  ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id, justificativa: 'Cliente com três concorrentes na disputa' }));
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((p) => p.ID === proposta.id).SITUACAO, 'AGUARDANDO_APROVACAO');
  assert.match(amb.api('s_vera', 'gerarDocumento', { id: proposta.id }).message, /aguarda a aprovação do desconto/);
  const cx = amb.ctx.Gestao_apiCaixa('s_gaspar', {});
  assert.equal(cx.ok, true, cx.message);
  const item = cx.itens.find((i) => i.tipo === 'comercial_desconto');
  assert.ok(item, 'item de desconto na Caixa do gestor comercial');
  assert.equal(item.tela.tipo, 'comercial');
  assert.ok(!amb.ctx.SGO_Pendencias_listar('s_tiago', { semCache: true }).itens.some((i) => i.tipo === 'comercial_desconto'), 'técnico não vê');
  assert.match(amb.api('s_vera', 'decidirDesconto', { id: proposta.id, aprovar: true, texto: 'aprovando o meu' }).message, /gestão comercial/);
  const neg = ok(amb.api('s_gaspar', 'decidirDesconto', { id: proposta.id, aprovar: false, texto: 'Ofereça pagamento em duas vezes no lugar do desconto' }));
  assert.equal(neg.proposta.situacao, 'RASCUNHO');
  assert.ok(amb.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'DESCONTO_NEGADO'));
  const hoje = ok(amb.api('s_vera', 'hoje'));
  assert.ok(hoje.itens.some((i) => i.regra === 'DESCONTO_NEGADO'));
  // depois da decisão a Caixa não tem mais o item
  amb.cache.GES_SINC_RECENTE = undefined; delete amb.cache.GES_SINC_RECENTE;
  assert.ok(!amb.ctx.Gestao_apiCaixa('s_gaspar', {}).itens.some((i) => i.tipo === 'comercial_desconto'));
  // dentro da política fica pronta direto
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: proposta.id, escopo: 'Qualificação térmica (QI, QO e QD) da autoclave da CME, com relatório e certificados.', descontoPct: '10', itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00' }], condicoes: { pagamento: 'Boleto', prazoExecucao: 'A combinar', garantia: '90 dias' } }));
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id })).proposta.situacao, 'PRONTA');
});

test('desconto pelo preço de tabela do catálogo e margem mínima configurada', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  const prod = ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'QT-AC', nome: 'Qualificação térmica', tipo: 'SERVICO', preco: '5.000,00', custo: '4.000,00' })).produto;
  const p = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta;
  const s = ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: p.id, escopo: 'Qualificação térmica completa da autoclave, com relatório final.', itens: [{ produtoId: prod.id, descricao: 'Qualificação térmica', quantidade: 1, precoUnitario: '4.000,00' }], condicoes: { pagamento: 'Boleto', prazoExecucao: 'A combinar' } }));
  assert.equal(s.politica.dentro, false, 'preço digitado 20% abaixo da tabela conta como desconto');
  const met = amb.ctx.Com_metodologia_();
  assert.equal(met.politica.descontoMaxPct, 15);
  // margem mínima: 30%, com custo 4.000 e preço 4.600 (desconto 8%) a margem fica 13%
  const nova = JSON.parse(JSON.stringify(met)); nova.politica.margemMinPct = 30;
  ok(amb.api('s_gaspar', 'metodologia', { salvar: nova, motivo: 'Margem mínima de teste' }));
  const s2 = ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: p.id, escopo: 'Qualificação térmica completa da autoclave, com relatório final.', itens: [{ produtoId: prod.id, descricao: 'Qualificação térmica', quantidade: 1, precoUnitario: '4.600,00' }], condicoes: { pagamento: 'Boleto', prazoExecucao: 'A combinar' } }));
  assert.equal(s2.politica.dentro, false);
  assert.match(s2.politica.motivos.join(' '), /margem de 13,0% abaixo da mínima de 30%/);
  assert.equal(amb.api('s_vera', 'metodologia', { salvar: nova, motivo: 'tentativa do vendedor' }).ok, false, 'vendedor não muda a metodologia');
});

// ------------------------------------------------------------------ documento A4
test('proposta A4: salva em Comercial - Propostas/<CNPJ> (HTML e PDF), dados congelados, marca de conferência, sem custo; o Enviar documento reconhece como documento de cliente', () => {
  const amb = ambiente();
  const { proposta } = propostaPronta(amb);
  ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: proposta.id }));
  const raiz = Object.values(amb.pastas).find((p) => p.nome === 'Comercial - Propostas');
  const pastaCli = Object.values(amb.pastas).find((p) => p.pai === raiz.id);
  assert.equal(pastaCli.nome, '11222333000181');
  const nomes = pastaCli.arquivos.map((id) => amb.arquivos[id].nome);
  assert.ok(nomes.some((n) => /^Proposta comercial - PROP-2026-0001 rev\.00 - Hospital Teste Alfa - 2026-10-19 1000\.pdf$/.test(n)), nomes.join(' | '));
  const html = amb.arquivos[g.htmlId].bytes.toString('utf8');
  assert.match(html, /PROP-2026-0001/);
  assert.match(html, /R\$ 4\.500,00/);
  assert.match(html, /Marca de conferência do conteúdo: [0-9a-f]{64}/);
  assert.match(html, /11\.222\.333\/0001-81/);
  assert.match(html, /Coordenadora da CME/);
  assert.doesNotMatch(html, /FABRICANTE X/, 'fabricante do equipamento não vai para a proposta');
  assert.doesNotMatch(html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '), /\b[Cc]usto\b|\b[Mm]argem\b/, 'sem custo nem margem no texto (os termos falam em "custos administrativos" e "custas judiciais", que não são o custo do item)');
  const reg = amb.tabelas.COM_PROPOSTAS.find((p) => p.ID === proposta.id);
  assert.equal(JSON.parse(reg.CONGELADO_JSON).cliente.razao, 'HOSPITAL TESTE ALFA LTDA');
  assert.equal(amb.ctx.EnviarDoc_raiz_([{ nome: '11222333000181' }, { nome: 'Comercial - Propostas' }]).classe, 'CLIENTE');
  // contatos do cliente entram como destinatários sugeridos do Enviar documento
  const sug = amb.ctx.EnviarDoc_contatosCliente_({ id: 'c1', chave: 'CLI:c1' });
  assert.ok(sug.some((c) => c.email === 'ana@alfa.exemplo.test' && /Coordenadora/.test(c.origem)));
});

test('envio: o registro do Enviar documento marca a proposta como enviada, leva a oportunidade para a etapa de proposta e agenda o retorno no 2º dia útil', () => {
  const amb = ambiente();
  const { oportunidade, proposta } = propostaPronta(amb);
  ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: proposta.id }));
  assert.equal(ok(amb.api('s_vera', 'sincronizarEnvios')).atualizadas, 0);
  amb.tabelas.DOC_ENVIOS.push({ ID: 'e1', ARQUIVO_ID: g.pdfId, SITUACAO: 'ENVIADO', CANAL: 'EMAIL', DESTINO: 'ana@alfa.exemplo.test', DESTINO_NOME: 'Ana', USUARIO_ID: 'u_ven', USUARIO_NOME: 'VERA', QUANDO: '2026-10-19T10:30:00' });
  assert.equal(ok(amb.api('s_vera', 'sincronizarEnvios')).atualizadas, 1);
  const p = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === proposta.id);
  assert.equal(p.SITUACAO, 'ENVIADA');
  const o = amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === oportunidade.id);
  assert.equal(o.ETAPA, 'ENG_3');
  const ret = amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === p.RETORNO_ATIVIDADE_ID);
  assert.equal(ret.PRAZO, '2026-10-21T10:00', 'segunda 19 enviou: 2º dia útil = quarta 21');
  assert.equal(ret.RESTRITA, 'SIM');
  assert.equal(o.ATIVIDADE_ID, ret.ID, 'o retorno é a próxima ação da oportunidade');
});

// ------------------------------------------------------------------ resposta e setores
test('resposta do cliente: aprovação exige o aceite (guardado na pasta do cliente) e marca ganha; pedido aos setores conclui e avisa o vendedor', () => {
  const amb = ambiente();
  const { oportunidade, proposta } = propostaPronta(amb);
  ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: proposta.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: proposta.id, como: 'Entregue em mãos na reunião com a CME' }));
  assert.match(amb.api('s_vera', 'respostaCliente', { id: proposta.id, resposta: 'APROVADA', texto: 'ok' }).message, /anexe o arquivo do aceite/);
  ok(amb.api('s_vera', 'respostaCliente', { id: proposta.id, resposta: 'APROVADA', texto: 'Aprovado pela coordenação', arquivo: { nome: 'pedido.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF pedido').toString('base64') } }));
  const aceite = Object.values(amb.arquivos).find((a) => /^Aceite - PROP-2026-0001/.test(a.nome));
  assert.ok(aceite);
  assert.equal(amb.pastas[aceite.pasta].nome, 'Aceites');
  assert.equal(amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === oportunidade.id).SITUACAO, 'GANHA');
  assert.ok(amb.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_gc' && v.TIPO === 'RESPOSTA_APROVADA' && v.EMAIL_SITUACAO === 'PENDENTE'), 'gestor comercial avisado (sistema e e-mail no expediente)');
  // pedido sem passagem: vendedor no Início; depois de 1 dia útil, Caixa
  assert.ok(amb.ctx.SGO_Pendencias_listar('s_vera', { semCache: true }).itens.some((i) => i.tipo === 'comercial_pedido_passar'));
  amb.mudar('2026-10-20T10:00:00-03:00');
  assert.ok(amb.ctx.Gestao_apiCaixa('s_gaspar', {}).itens.some((i) => i.tipo === 'comercial_pedido_parado'));
  const op = ok(amb.api('s_vera', 'opcoesPassagem', { id: proposta.id }));
  assert.deepEqual(op.setores.filter((s) => s.obrigatorio).map((s) => s.codigo).sort(), ['FINANCEIRO', 'TECNICA']);
  ok(amb.api('s_vera', 'passarSetores', { id: proposta.id, setores: ['COMPRAS'] }));
  const atvs = amb.tabelas.ATV_ATIVIDADES.filter((a) => /Pedido aprovado/.test(a.TITULO));
  assert.equal(atvs.length, 3);
  assert.equal(atvs.find((a) => /Compras/.test(a.TITULO)).RESPONSAVEL_ID, 'u_log', 'Compras: gestor da área Logística');
  assert.equal(atvs.find((a) => /Compras/.test(a.TITULO)).PRAZO, '2026-10-21T17:00', 'Compras: 1 dia útil');
  assert.equal(atvs.find((a) => /Financeiro/.test(a.TITULO)).PRAZO, '2026-10-22T17:00', 'Financeiro: 2 dias úteis');
  assert.match(amb.api('s_vera', 'passarSetores', { id: proposta.id }).message, /já receberam/);
  // setores concluem: a rotina avisa o vendedor e conclui o pedido
  atvs.forEach((a) => { a.SITUACAO = 'Concluída'; a.OBS_CONCLUSAO = 'Feito no teste'; });
  amb.ctx.ComP_acompanharPassagens_();
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === proposta.id).PEDIDO_SITUACAO, 'CONCLUIDO');
  assert.equal(amb.tabelas.COM_AVISOS.filter((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'SETOR_CONCLUIU').length, 3);
});

test('perda: motivo da lista e aprendizado; cancela atividades e propostas não respondidas, inclusive rascunho; reabertura pedida vai à Caixa e a gestão reabre', () => {
  const amb = ambiente();
  const { oportunidade, proposta } = propostaPronta(amb);
  assert.match(amb.api('s_vera', 'perder', { id: oportunidade.id, motivo: 'Sem retorno', aprendizado: 'xxxxxxxxxxxxxxxx' }).message, /motivo na lista/);
  assert.match(amb.api('s_vera', 'perder', { id: oportunidade.id, motivo: 'Concorrente escolhido', aprendizado: 'curto' }).message, /pelo menos 15 letras/);
  ok(amb.api('s_vera', 'perder', { id: oportunidade.id, motivo: 'Concorrente escolhido', aprendizado: 'Concorrente local com preço menor e prazo imediato' }));
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === proposta.id).SITUACAO, 'CANCELADA', 'rascunho também cancelado');
  assert.ok(amb.tabelas.ATV_ATIVIDADES.every((a) => a.SITUACAO === 'Cancelada'));
  assert.equal(amb.api('s_vera', 'reabrir', { id: oportunidade.id, motivo: 'quero reabrir agora', proxima: { acao: 'Ligar de novo', data: '2026-10-21' } }).ok, false, 'vendedor não reabre');
  ok(amb.api('s_vera', 'pedirReabertura', { id: oportunidade.id, motivo: 'Cliente retomou o contato e pediu nova proposta' }));
  assert.ok(amb.ctx.Gestao_apiCaixa('s_gaspar', {}).itens.some((i) => i.tipo === 'comercial_reabertura'));
  ok(amb.api('s_gaspar', 'reabrir', { id: oportunidade.id, motivo: 'Cliente pediu nova proposta por e-mail', proxima: { acao: 'Ligar para entender o novo escopo', data: '2026-10-21' } }));
  const o = amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === oportunidade.id);
  assert.equal(o.SITUACAO, 'ABERTA');
  assert.equal(o.MOTIVO_PERDA, '');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === oportunidade.id && h.TIPO === 'PERDIDA'), 'perda anterior fica no histórico');
});

// ------------------------------------------------------------------ gestora comercial
test('lista do dia pelas regras, sem IA: sem próxima ação (atividade concluída em Minhas atividades), parada, retorno atrasado e ordem de prioridade', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  const atv = amb.tabelas.ATV_ATIVIDADES[0];
  let hoje = ok(amb.api('s_vera', 'hoje'));
  assert.equal(hoje.origem, 'REGRAS');
  assert.equal(hoje.iaDisponivel, false);
  assert.ok(!hoje.itens.some((i) => i.regra === 'SEM_PROXIMA'));
  amb.mudar('2026-10-21T09:00:00-03:00');
  hoje = ok(amb.api('s_vera', 'hoje'));
  assert.equal(hoje.itens[0].regra, 'RETORNO_ATRASADO');
  assert.equal(hoje.itens[0].prioridade, 1);
  atv.SITUACAO = 'Concluída';
  hoje = ok(amb.api('s_vera', 'hoje'));
  assert.equal(hoje.itens[0].regra, 'SEM_PROXIMA');
  assert.ok(amb.ctx.SGO_Pendencias_listar('s_vera', { semCache: true }).itens.some((i) => i.tipo === 'comercial_sem_proxima'));
  assert.ok(amb.ctx.Gestao_apiCaixa('s_gaspar', {}).itens.some((i) => i.tipo === 'comercial_sem_proxima'), 'gestor comercial do cadastro recebe na Caixa');
  // registrar contato resolve; 12 dias depois sem contato = parada, e não muda de etapa
  ok(amb.api('s_vera', 'registrarContato', { id: oportunidade.id, tipo: 'LIGACAO', respondeu: false, resumo: 'Ninguém atendeu na CME', proxima: { acao: 'Tentar por WhatsApp', data: '2026-10-22' } }));
  amb.mudar('2026-11-03T09:00:00-03:00');
  hoje = ok(amb.api('s_vera', 'hoje'));
  assert.ok(hoje.itens.some((i) => i.regra === 'PARADA' && /parada há 13 dias/.test(i.titulo)), hoje.itens.map((i) => i.titulo).join(' | '));
  assert.match(amb.api('s_vera', 'moverEtapa', { id: oportunidade.id, etapa: 'ENG_2' }).message, /parada há 13 dias/);
  // panorama da gestão: cadência quebrada
  const pan = ok(amb.api('s_gaspar', 'hoje', { papel: 'GESTAO' }));
  assert.ok(pan.itens.some((i) => i.regra === 'CADENCIA_QUEBRADA'));
  // "não se aplica" exige motivo e fica registrado
  assert.equal(amb.api('s_vera', 'decidirSugestao', { chave: hoje.itens[0].chave, regra: hoje.itens[0].regra, decisao: 'NAO_SE_APLICA' }).ok, false);
  ok(amb.api('s_vera', 'decidirSugestao', { chave: hoje.itens[0].chave, regra: hoje.itens[0].regra, decisao: 'NAO_SE_APLICA', motivo: 'Cliente em férias coletivas' }));
  assert.equal(amb.tabelas.COM_IA_SUGESTOES.length, 1);
});

test('a gestora não inventa: o verificador recusa número, promessa de desconto e afirmação de envio; vale o texto das regras', () => {
  const respostas = [];
  const amb = ambiente({ ia: (prompt) => {
    if (/TAREFA: como gestora comercial, diga ao vendedor/.test(prompt)) {
      return JSON.stringify({ proximoPasso: 'Ligue hoje e ofereça um desconto de 25% para fechar.', porque: 'A oportunidade de R$ 4.500,00 está na etapa de prospecção.',
        perguntas: ['Quem aprova a compra na unidade?', 'O prazo é de 37 dias?'], mensagem: 'Olá, Ana. Enviei ontem a proposta de R$ 9.999,00.', emailAssunto: 'Metrolabs: qualificação da autoclave', emailCorpo: 'Prezada Ana, garantimos a execução em 2 dias.' });
    }
    if (/lista do vendedor/.test(prompt)) { const m = /"chave":"([^"]+)"/.exec(prompt); respostas.push(m[1]); return JSON.stringify({ resumo: 'Um item para hoje.', itens: [{ chave: m[1], porque: 'Retorno combinado ficou para trás: a cadência pede contato hoje.', acao: 'Ligue e confirme o escopo; se não atender, mande mensagem curta.' }] }); }
    return '{}';
  } });
  const { oportunidade } = oportunidadeDeTeste(amb);
  const r = ok(amb.api('s_vera', 'proximoPasso', { id: oportunidade.id }));
  assert.equal(r.sugestao.porque.indexOf('etapa de prospecção') >= 0 && r.origem === 'IA', true, 'texto com número dos dados passa');
  assert.doesNotMatch(r.sugestao.proximoPasso, /desconto de 25%/, 'promessa de desconto recusada');
  assert.doesNotMatch(r.sugestao.mensagem, /9\.999/, 'valor inventado recusado');
  assert.doesNotMatch(r.sugestao.emailCorpo, /garantimos/);
  assert.match(r.aviso, /verificador recusou/);
  assert.ok(!r.sugestao.perguntas.some((q) => /37 dias/.test(q)), 'pergunta com número inventado sai');
  assert.ok(amb.tabelas.COM_IA_SUGESTOES.some((s) => s.TIPO === 'PROXIMO_PASSO'));
  assert.ok(amb.iaPrompts.some((p) => /METODOLOGIA:[\s\S]*Prospecção e qualificação/.test(p)), 'a metodologia gravada vai no prompt');
  // a lista do dia com IA: texto conferido entra
  amb.mudar('2026-10-21T09:00:00-03:00');
  const h = ok(amb.api('s_vera', 'hoje', { gerarComIA: true }));
  assert.equal(h.origem, 'IA');
  assert.ok(h.itens.some((i) => i.daGestora && /cadência pede contato hoje/.test(i.porque)));
  // verificador direto
  const v = amb.ctx.ComG_verificar_('A proposta de R$ 4.500,00 vence em 03/11/2026.', { total: 'R$ 4.500,00' });
  assert.equal(v.ok, true, v.problemas.join('; '));
  assert.equal(amb.ctx.ComG_verificar_('A proposta de R$ 5.200,00 vence logo.', { total: 'R$ 4.500,00' }).ok, false);
  assert.equal(amb.ctx.ComG_verificar_('Conforme a RDC 509/2021, faça o retorno.', {}).ok, false, 'norma não citada pela gestora');
});

test('revisão da proposta pela gestora: erros impedem concluir; alertas de cadastro', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  const p = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta;
  const r = ok(amb.api('s_vera', 'revisarProposta', { id: p.id }));
  assert.ok(r.erros.some((e) => /não tem itens/.test(e)));
  assert.match(amb.api('s_vera', 'concluirProposta', { id: p.id }).message, /a proposta não tem itens/);
  // cliente sem CNPJ: alerta (não impede)
  const ct = ok(amb.api('s_vera', 'salvarContato', { clienteId: 'c2', nome: 'Beto Compras Teste', email: 'beto@beta.exemplo.test' })).contato;
  const o2 = ok(amb.api('s_vera', 'salvarOportunidade', { titulo: 'Lavadora', clienteId: 'c2', contatoId: ct.id, funil: 'ENGENHARIA', origem: 'Indicação', valor: '2000', proxima: { acao: 'Ligar para o Beto', data: '2026-10-20' } })).oportunidade;
  const p2 = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: o2.id })).proposta;
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: p2.id, escopo: 'Qualificação da lavadora termodesinfectora da CME, com relatório.', itens: [{ descricao: 'Qualificação de lavadora', quantidade: 1, precoUnitario: '2.000,00' }], condicoes: { pagamento: 'Boleto', prazoExecucao: 'A combinar', garantia: '90 dias' } }));
  const r2 = ok(amb.api('s_vera', 'revisarProposta', { id: p2.id }));
  assert.equal(r2.erros.length, 0, r2.erros.join('; '));
  assert.ok(r2.alertas.some((a) => /sem CNPJ completo/.test(a)));
  ok(amb.api('s_vera', 'concluirProposta', { id: p2.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: p2.id }));
  assert.ok(Object.values(amb.pastas).some((x) => x.nome === 'CLINICA TESTE BETA'), 'sem CNPJ, a pasta fica pelo nome do cliente');
});

// ------------------------------------------------------------------ contatos
test('contatos: o contato antigo do cliente e o responsável da unidade viram contatos sem apagar nem trocar nada; migração não repete', () => {
  const amb = ambiente();
  const antes = JSON.stringify([amb.tabelas.CAD_CLIENTES, amb.tabelas.CAD_UNIDADES]);
  ok(amb.api('s_vera', 'iniciar'));
  const migrados = amb.tabelas.CAD_CONTATOS.filter((c) => /MIGRADO/.test(c.ORIGEM));
  assert.equal(migrados.length, 2);
  const cli = migrados.find((c) => c.ORIGEM === 'MIGRADO_CLIENTE');
  assert.equal(cli.NOME, 'Carla Compras Teste');
  assert.equal(cli.EMAIL, 'compras@alfa.exemplo.test');
  assert.equal(cli.PRINCIPAL, 'SIM');
  const un = migrados.find((c) => c.ORIGEM === 'MIGRADO_UNIDADE');
  assert.equal(un.UNIDADE_ID, 'un1');
  assert.equal(un.CELULAR, '62988887777');
  assert.equal(JSON.stringify([amb.tabelas.CAD_CLIENTES, amb.tabelas.CAD_UNIDADES]), antes, 'cadastro do cliente e da unidade intacto');
  ok(amb.api('s_vera', 'cliente', { clienteId: 'c1' }));
  amb.ctx.ComCt_migrar_('');
  assert.equal(amb.tabelas.CAD_CONTATOS.filter((c) => /MIGRADO/.test(c.ORIGEM)).length, 2, 'não repete');
  // inativar não apaga; e-mail do contato identifica o cliente no e-mail integrado
  const id = cli.ID;
  assert.equal(amb.api('s_vera', 'inativarContato', { id, motivo: '' }).ok, false);
  ok(amb.api('s_vera', 'inativarContato', { id, motivo: 'Saiu do hospital' }));
  assert.equal(amb.tabelas.CAD_CONTATOS.find((c) => c.ID === id).STATUS, 'INATIVO');
  assert.equal(amb.api('s_tiago', 'salvarContato', { clienteId: 'c1', nome: 'Teste Tecnico', email: 'x@y.test' }).ok, false, 'técnico não mexe nos contatos');
});

// ------------------------------------------------------------------ rotina
test('rotina: vence a proposta sem resposta, cria a atividade de validade perto do vencimento, roda no máximo uma vez por hora e monta a lista do dia', () => {
  const amb = ambiente();
  const { proposta } = propostaPronta(amb);
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: proposta.id, validadeDias: '3', escopo: 'Qualificação térmica (QI, QO e QD) da autoclave da CME, com relatório e certificados.', itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00' }], condicoes: { pagamento: 'Boleto', prazoExecucao: 'A combinar', garantia: '90 dias' } }));
  ok(amb.api('s_vera', 'concluirProposta', { id: proposta.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: proposta.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: proposta.id, como: 'Entregue em mãos na reunião com a CME' }));
  const r1 = amb.ctx.Comercial_rotina_(undefined, true);
  assert.equal(r1.validade.avisadas, 1);
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((a) => /vence em 22\/10\/2026/.test(a.TITULO)));
  assert.ok(amb.tabelas.COM_DIA.some((d) => d.USUARIO_ID === 'u_ven'), 'lista do dia da vendedora');
  assert.ok(amb.tabelas.COM_DIA.some((d) => d.USUARIO_ID === 'u_gc' && d.PAPEL === 'GESTAO'), 'panorama do gestor comercial');
  assert.match(String(amb.ctx.Comercial_rotina_().fora), /menos de 1 hora/);
  amb.mudar('2026-10-23T09:00:00-03:00');
  amb.ctx.Comercial_rotina_(undefined, true);
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === proposta.id).SITUACAO, 'VENCIDA', 'vence sem ninguém abrir nada');
  assert.ok(ok(amb.api('s_vera', 'hoje')).itens.some((i) => i.regra === 'PROPOSTA_VENCIDA'));
  // e-mail dos avisos: só no expediente, pelo notificador (categoria COMERCIAL), nunca WhatsApp
  assert.equal(amb.whats.length, 0);
});

test('painel e relatório mensal: indicadores pt-BR e relatório A4 na pasta Comercial - Relatórios', () => {
  const amb = ambiente();
  const { oportunidade } = oportunidadeDeTeste(amb);
  ok(amb.api('s_vera', 'ganhar', { id: oportunidade.id }));
  const p = ok(amb.api('s_gaspar', 'painel', { competencia: '2026-10' }));
  assert.equal(p.indicadores.ganho.qtd, 1);
  assert.equal(p.indicadores.ganho.valor, 4500);
  assert.equal(p.indicadores.conversaoTxt, '100,0%');
  assert.equal(ok(amb.api('s_vera', 'painel', { competencia: '2026-10' })).indicadores.porVendedor, undefined, 'vendedor não vê a equipe');
  assert.equal(amb.api('s_vera', 'relatorioMes', { competencia: '2026-10' }).ok, false);
  const r = ok(amb.api('s_gaspar', 'relatorioMes', { competencia: '2026-10' }));
  assert.equal(r.salvo, true);
  assert.match(r.html, /Relatório mensal do Comercial/);
  assert.match(r.html, /R\$ 4\.500,00/);
  assert.ok(Object.values(amb.pastas).some((x) => x.nome === 'Comercial - Relatórios'));
  assert.equal(amb.ctx.Comercial_emUso_(), true);
  assert.equal(amb.ctx.Ges_relatoriosMensaisLista_().map((x) => x[0]).slice(-1)[0], 'COMERCIAL', 'entra nos relatórios do 1º dia útil');
});

test('banco novo: a primeira oportunidade cria as abas de Minhas atividades; salvar o rascunho sem um campo não apaga o texto padrão', () => {
  const amb = ambiente({ tabelas: { ATV_ATIVIDADES: undefined, ATV_HISTORICO: undefined, ATV_AVISOS: undefined } });
  const { oportunidade } = oportunidadeDeTeste(amb);
  assert.ok(Array.isArray(amb.tabelas.ATV_ATIVIDADES) && amb.tabelas.ATV_ATIVIDADES.length === 1, 'atividade criada mesmo sem a aba existir antes');
  const p = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta;
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: p.id, itens: [{ descricao: 'Item de teste', quantidade: 1, precoUnitario: '100' }] }));
  const reg = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id);
  assert.match(reg.APRESENTACAO, /agradece a oportunidade/);
  assert.match(JSON.parse(reg.CONDICOES_JSON).pagamento, /Boleto/);
  // o retorno criado pela própria vendedora ao enviar não gera aviso de "nova atividade" para ela
  ok(amb.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: p.id, escopo: 'Escopo de teste com mais de trinta letras para a revisão.', itens: [{ descricao: 'Item de teste', quantidade: 1, precoUnitario: '100' }] }));
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: p.id, como: 'Entregue em mãos (teste)' }));
  const ret = amb.tabelas.ATV_ATIVIDADES.find((a) => /Retorno sobre a proposta/.test(a.TITULO));
  assert.equal(ret.CRIADO_POR_ID, 'u_ven');
  assert.ok(!amb.tabelas.ATV_AVISOS.some((v) => v.ATIVIDADE_ID === ret.ID && v.TIPO === 'NOVA'));
});
