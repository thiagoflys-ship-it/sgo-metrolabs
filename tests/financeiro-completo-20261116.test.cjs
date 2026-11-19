// Financeiro no SGO+ (16/11/2026): especificação do especialista de finanças (output/financeiro-20261116/especialistas/
// ESPEC_FINANCEIRO.md). Código REAL do SGO+ (ambiente da Conciliação Caju: sessões, caixas, sigilo, Chaves) + SGO_Omie*.js, com um
// OMIE SIMULADO no lugar do UrlFetchApp (nada sai para a rede) e XMLs FICTÍCIOS de NF-e e NFS-e (ABRASF e Nacional).
// Confere: B1 a B9 (seção 1), cadastro de cliente e fornecedor no Omie (seção 2), nota recebida virando conta a pagar (seção 3),
// explicações dos campos em Compras e na Conciliação Caju (seção 4) e marca d'água, planilha e impressão identificadas (seção 5),
// na página completa a 390, 320 e 1366 px (capturas em output/financeiro-20261116/capturas-dev/).
// Uso: DEST=<legado> node --require <fontes.cjs> tests/financeiro-completo-20261116.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambienteCaju, PASTA } = require('./_caju_ambiente.cjs');
const { criarXmlService } = require('./_xmlservice_teste.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_DEV || path.join(__dirname, '../output/financeiro-20261116/capturas-dev');
const ARQUIVOS = ['SGO_Financeiro_Marca.js', 'SGO_Omie.js', 'SGO_Omie_Gestao.js', 'SGO_Omie_Operacoes.js', 'SGO_Omie_Conciliacao.js', 'SGO_Omie_Faturamento.js', 'SGO_Omie_Pedidos.js', 'SGO_Omie_Sigilo.js', 'SGO_Omie_Cadastro.js', 'SGO_Omie_Notas.js'];

// CNPJs fictícios com dígito verificador válido
function cnpj(base12) {
  const dv = (b, p) => { const s = b.split('').reduce((t, c, i) => t + Number(c) * p[i], 0), r = s % 11; return r < 2 ? 0 : 11 - r; };
  const d1 = dv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]); const d2 = dv(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base12 + d1 + d2;
}
const EMPRESA = cnpj('123456780001'), FORN = cnpj('987654320001'), PREST = cnpj('456789120001'), OUTRA = cnpj('111111110001');
const fmt = (d) => d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
const CHAVE = '52261198765432000100550010000045671000045670';
const CHAVE_NAC = '52087072' + '123456789012345678901234567890123456789012';

function nfe(o) {
  o = Object.assign({ chave: CHAVE, dest: EMPRESA, fin: '1', cStat: '100', dups: [['001', '2026-12-10', '500.00'], ['002', '2027-01-10', '500.00']], vNF: '1000.00', vLiq: '1000.00', tPag: '15', itens: 2 }, o);
  return '<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe' + o.chave + '" versao="4.00">' +
    '<ide><cUF>52</cUF><mod>55</mod><serie>1</serie><nNF>4567</nNF><dhEmi>2026-11-10T09:00:00-03:00</dhEmi><tpNF>1</tpNF><finNFe>' + o.fin + '</finNFe></ide>' +
    '<emit><CNPJ>' + FORN + '</CNPJ><xNome>PECAS FICTICIAS LTDA</xNome><xFant>Pecas Ficticias</xFant><enderEmit><xLgr>Rua Ficticia</xLgr><nro>100</nro><xBairro>Centro</xBairro><cMun>5208707</cMun><xMun>Goiania</xMun><UF>GO</UF><CEP>74000000</CEP><fone>6233334444</fone></enderEmit><IE>123456789</IE><CRT>1</CRT></emit>' +
    '<dest><CNPJ>' + o.dest + '</CNPJ><xNome>EMPRESA FICTICIA</xNome></dest>' +
    Array.from({ length: o.itens }, (_, i) => '<det nItem="' + (i + 1) + '"><prod><xProd>Item ficticio ' + (i + 1) + '</xProd></prod></det>').join('') +
    '<total><ICMSTot><vNF>' + o.vNF + '</vNF></ICMSTot></total>' +
    (o.dups.length ? '<cobr><fat><nFat>4567</nFat><vOrig>' + o.vNF + '</vOrig><vDesc>0.00</vDesc><vLiq>' + o.vLiq + '</vLiq></fat>' + o.dups.map((d) => '<dup><nDup>' + d[0] + '</nDup><dVenc>' + d[1] + '</dVenc><vDup>' + d[2] + '</vDup></dup>').join('') + '</cobr>' : '') +
    '<pag><detPag><indPag>1</indPag><tPag>' + o.tPag + '</tPag><vPag>' + o.vNF + '</vPag></detPag></pag></infNFe></NFe>' +
    '<protNFe versao="4.00"><infProt><chNFe>' + o.chave + '</chNFe><cStat>' + o.cStat + '</cStat></infProt></protNFe></nfeProc>';
}
function abrasf(o) {
  o = Object.assign({ tomador: EMPRESA, liquido: '1837.00', duas: false }, o);
  const uma = '<CompNfse><Nfse versao="2.02"><InfNfse Id="nf1"><Numero>789</Numero><CodigoVerificacao>ABC123</CodigoVerificacao><DataEmissao>2026-11-12T10:00:00</DataEmissao>' +
    '<ValoresNfse><BaseCalculo>2000.00</BaseCalculo><Aliquota>2</Aliquota><ValorIss>40.00</ValorIss><ValorLiquidoNfse>' + o.liquido + '</ValorLiquidoNfse></ValoresNfse>' +
    '<PrestadorServico><IdentificacaoPrestador><CpfCnpj><Cnpj>' + PREST + '</Cnpj></CpfCnpj><InscricaoMunicipal>555</InscricaoMunicipal></IdentificacaoPrestador><RazaoSocial>SERVICOS FICTICIOS LTDA</RazaoSocial>' +
    '<Endereco><Endereco>Av Teste</Endereco><Numero>10</Numero><Bairro>Setor Sul</Bairro><CodigoMunicipio>5208707</CodigoMunicipio><Uf>GO</Uf><Cep>74000100</Cep></Endereco></PrestadorServico>' +
    '<OrgaoGerador><CodigoMunicipio>5208707</CodigoMunicipio><Uf>GO</Uf></OrgaoGerador><DeclaracaoPrestacaoServico><InfDeclaracaoPrestacaoServico><Competencia>2026-11-01</Competencia>' +
    '<Servico><Valores><ValorServicos>2000.00</ValorServicos><ValorPis>13.00</ValorPis><ValorCofins>60.00</ValorCofins><ValorInss>0</ValorInss><ValorIr>30.00</ValorIr><ValorCsll>20.00</ValorCsll><ValorIss>40.00</ValorIss></Valores><IssRetido>1</IssRetido><Discriminacao>Manutencao ficticia</Discriminacao></Servico>' +
    '<Prestador><CpfCnpj><Cnpj>' + PREST + '</Cnpj></CpfCnpj></Prestador><TomadorServico><IdentificacaoTomador><CpfCnpj><Cnpj>' + o.tomador + '</Cnpj></CpfCnpj></IdentificacaoTomador><RazaoSocial>EMPRESA FICTICIA</RazaoSocial></TomadorServico>' +
    '</InfDeclaracaoPrestacaoServico></DeclaracaoPrestacaoServico></InfNfse></Nfse></CompNfse>';
  return '<?xml version="1.0" encoding="UTF-8"?><ConsultarNfseRpsResposta xmlns="http://www.abrasf.org.br/nfse.xsd">' + uma + (o.duas ? uma.replace('<Numero>789</Numero>', '<Numero>790</Numero>') : '') + '</ConsultarNfseRpsResposta>';
}
function nacional() {
  return '<?xml version="1.0" encoding="UTF-8"?><NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infNFSe Id="NFS' + CHAVE_NAC + '"><xLocEmi>Goiania</xLocEmi><cLocIncid>5208707</cLocIncid><nNFSe>321</nNFSe><dhProc>2026-11-13T11:00:00-03:00</dhProc>' +
    '<emit><CNPJ>' + PREST + '</CNPJ><xNome>CONSULTORIA FICTICIA SA</xNome></emit><valores><vBC>1500.00</vBC><vISSQN>30.00</vISSQN><vLiq>1470.00</vLiq></valores>' +
    '<DPS versao="1.00"><infDPS Id="DPS1"><dhEmi>2026-11-13T10:00:00-03:00</dhEmi><dCompet>2026-11-13</dCompet><toma><CNPJ>' + EMPRESA + '</CNPJ><xNome>EMPRESA FICTICIA</xNome></toma>' +
    '<valores><vServPrest><vServ>1500.00</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>2</tpRetISSQN></tribMun><tribFed><piscofins><CST>01</CST><tpRetPisCofins>2</tpRetPisCofins><vPis>9.75</vPis><vCofins>45.00</vCofins></piscofins></tribFed></trib></valores>' +
    '</infDPS></DPS></infNFSe></NFSe>';
}

function montar(opcoes) {
  const o = opcoes || {};
  const a = ambienteCaju({ comChaves: true });
  for (const f of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  vm.runInContext('PODERES_CATALOGO_MEMO = null;', a.ctx);
  a.ctx.XmlService = criarXmlService();
  Object.assign(a.props, { OMIE_APP_KEY: 'chave-ficticia-omie', OMIE_APP_SECRET: 'segredo-ficticio-omie', OMIE_SIGILO_CONTAS: '["u_adm","u_dir","u_fin","u_fin2"]', OMIE_EMPRESA_CNPJ: EMPRESA });
  if (o.gravacao !== false) a.props.OMIE_GRAVACAO_LIGADA = '1';
  a.omie = []; a.titulo = { codigo_lancamento_omie: 101, numero_documento: 'NF-001', codigo_cliente_fornecedor: 12, codigo_categoria: '1.01', id_conta_corrente: 5, data_vencimento: '20/11/2026', data_previsao: '20/11/2026', valor_documento: 1000, status_titulo: 'EMABERTO' };
  a.saldo = 1000; a.clientes = []; a.contasPagar = []; a.recebimento = null; a.falhas = {}; a.seq = 900;
  a.ctx.Utilities.sleep = () => {};
  // o servidor (sgo_servidor/src/compat/basicos.ts) tem getKeys; o ambiente de teste base não tinha
  const props0 = a.ctx.PropertiesService.getScriptProperties;
  a.ctx.PropertiesService.getScriptProperties = () => Object.assign(props0(), { getKeys: () => Object.keys(a.props) });
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (!/app\.omie\.com\.br/.test(url)) return anterior(url, op);
    const b = JSON.parse(op.payload), p = b.param[0]; a.omie.push({ url, call: b.call, param: p });
    const f = a.falhas[b.call];
    if (f && f.length) { const x = f.shift(); if (x === 'transporte') throw new Error('rede caiu'); return resp(500, x); }
    switch (b.call) {
      case 'ConsultarContaReceber': case 'ConsultarContaPagar': return resp(200, Object.assign({}, a.titulo));
      case 'ListarContasReceber': return resp(200, { total_de_paginas: 1, conta_receber_cadastro: [Object.assign({}, a.titulo)] });
      case 'ListarMovimentos': return resp(200, a.saldo === null ? { movimentos: [] } : { nTotPaginas: 1, movimentos: [{ detalhes: { nCodTitulo: p.nCodTitulo }, resumo: { nValAberto: a.saldo, nValPago: 0 } }] });
      case 'ConsultarCliente': { const c = a.clientes.find((x) => x.codigo_cliente_omie === p.codigo_cliente_omie); return resp(200, c ? Object.assign({}, c) : { razao_social: 'Cliente Simulado Ltda', tags: [] }); }
      case 'ListarClientes': {
        if (p.clientesFiltro && p.clientesFiltro.cnpj_cpf) { const l = a.clientes.filter((x) => x.cnpj_cpf.replace(/\D/g, '') === p.clientesFiltro.cnpj_cpf.replace(/\D/g, '')); return l.length ? resp(200, { total_de_paginas: 1, clientes_cadastro: l }) : resp(500, { faultstring: 'ERROR: Não existem registros para a página [1]!', faultcode: 'SOAP-ENV:Client-5113' }); }
        if (p.clientesFiltro && p.clientesFiltro.razao_social) return resp(200, { total_de_paginas: 1, clientes_cadastro: a.clientes.filter((x) => x.razao_social.toLowerCase().includes(p.clientesFiltro.razao_social.toLowerCase())) });
        return resp(200, { total_de_paginas: 1, clientes_cadastro: a.clientes });
      }
      case 'ListarCategorias': return resp(200, { total_de_paginas: 1, categoria_cadastro: [
        { codigo: '1.01', descricao: 'Receitas de serviços', conta_receita: 'S', conta_despesa: 'N' }, { codigo: '1', descricao: 'Receitas', totalizadora: 'S' },
        { codigo: '2.03', descricao: 'Combustível', conta_receita: 'N', conta_despesa: 'S' }, { codigo: '2.09', descricao: 'Despesa desativada', conta_despesa: 'S', conta_inativa: 'S' },
        { codigo: '2.10', descricao: 'Serviços de terceiros', conta_despesa: 'S', conta_receita: 'N' }, { codigo: '9.01', descricao: 'Transferência', transferencia: 'S', conta_despesa: 'S' }] });
      case 'ConsultarCategoria': return resp(200, { '1.01': { descricao: 'Receitas de serviços', conta_receita: 'S', conta_despesa: 'N' }, '2.03': { descricao: 'Combustível', conta_despesa: 'S', conta_receita: 'N' }, '2.10': { descricao: 'Serviços de terceiros', conta_despesa: 'S', conta_receita: 'N' }, '2.09': { descricao: 'Despesa desativada', conta_despesa: 'S', conta_inativa: 'S' } }[p.codigo] || {});
      case 'ConsultarContaCorrente': case 'ListarContasCorrentes': return resp(200, { descricao: 'Banco simulado', total_de_paginas: 1, ListarContasCorrentes: [{ nCodCC: 5, descricao: 'Banco simulado' }] });
      case 'ConsultarRecebimento': return a.recebimento ? resp(200, a.recebimento) : resp(500, { faultstring: 'ERROR: Recebimento não encontrado para a chave informada.', faultcode: 'SOAP-ENV:Client-102' });
      case 'ListarContasPagar': return a.contasPagar.length ? resp(200, { total_de_paginas: 1, conta_pagar_cadastro: a.contasPagar }) : resp(500, { faultstring: 'ERROR: Não existem registros para a página [1]!', faultcode: 'SOAP-ENV:Client-5113' });
      case 'IncluirContaPagar': { const c = ++a.seq; a.contasPagar.push(Object.assign({ codigo_lancamento_omie: c }, p)); return resp(200, { codigo_lancamento_omie: c, codigo_lancamento_integracao: p.codigo_lancamento_integracao, codigo_status: '0', descricao_status: 'Lançamento cadastrado com sucesso!' }); }
      case 'IncluirCliente': { const c = ++a.seq; a.clientes.push(Object.assign({ codigo_cliente_omie: c, inativo: 'N' }, p)); return resp(200, { codigo_cliente_omie: c, codigo_cliente_integracao: p.codigo_cliente_integracao, codigo_status: '0', descricao_status: 'Cliente cadastrado com sucesso!' }); }
      case 'AlterarCliente': { const c = a.clientes.find((x) => x.codigo_cliente_omie === p.codigo_cliente_omie); if (c) c.tags = p.tags; return resp(200, { codigo_cliente_omie: p.codigo_cliente_omie, codigo_status: '0' }); }
      default: return resp(200, { codigo_status: '0', codigo_lancamento_omie: 101 });
    }
  };
  a.f = (fn, login, dados) => { vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx); return JSON.parse(JSON.stringify(a.ctx[fn]('s_' + login, dados || {}))); };
  a.escritas = () => a.omie.filter((c) => !/^(Listar|Consultar|Obter)/.test(c.call));
  a.esperar = () => vm.runInContext('OMIE_ESPERA_RECONSULTA_MS = 0;', a.ctx); // o "1 minuto do Omie" não precisa passar no teste
  a.esperar();
  return a;
}
const fornecedorNoOmie = (a, tags) => a.clientes.push({ codigo_cliente_omie: 55, razao_social: 'PECAS FICTICIAS LTDA', cnpj_cpf: fmt(FORN), inativo: 'N', tags: (tags || ['Fornecedor']).map((t) => ({ tag: t })) });

// ------------------------------------------------------------------------------------------------ seção 1: B1 a B9
// 19/11/2026 (auditoria do Financeiro): juros, multa e desconto LIBERADOS (conferido nos dados reais do Omie: banco = valor + juros + multa − desconto).
// A trava de antes continua disponível pela chave OMIE_BAIXA_ACRESCIMO_DESLIGADO = 1.
test('B1: baixa com juros, multa ou desconto mostra o efeito no banco; desligada pela chave, é recusada antes de qualquer envio', () => {
  const a = montar();
  const efeito = { juros: /R\$ 102,00 entram na conta escolhida \(valor baixado R\$ 100,00 \+ juros R\$ 2,00\)/, multa: /R\$ 101,00 entram/, desconto: /R\$ 99,50 entram na conta escolhida \(valor baixado R\$ 100,00 − desconto R\$ 0,50\)/ };
  for (const extra of [{ juros: 2 }, { multa: 1 }, { desconto: 0.5 }]) {
    const r = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: Object.assign({ contaId: 5, valor: 100, data: '2026-11-16' }, extra) });
    assert.equal(r.ok, true, r.mensagem); assert.ok(r.resumo.some((l) => l[0] === 'Efeito na conta corrente' && efeito[Object.keys(extra)[0]].test(l[1])), JSON.stringify(r.resumo));
  }
  assert.match(a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 10, desconto: 20, data: '2026-11-16' } }).mensagem, /desconto .* é maior que o valor baixado/);
  a.props.OMIE_BAIXA_ACRESCIMO_DESLIGADO = '1';
  for (const extra of [{ juros: 2 }, { multa: 1 }, { desconto: 0.5 }]) {
    const r = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: Object.assign({ contaId: 5, valor: 100, data: '2026-11-16' }, extra) });
    assert.equal(r.ok, false); assert.match(r.mensagem, /desligada pelo responsável pelo sistema/); assert.match(r.mensagem, /direto no Omie/);
  }
  delete a.props.OMIE_BAIXA_ACRESCIMO_DESLIGADO;
  const ok = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 100, data: '2026-11-16' } });
  assert.equal(ok.ok, true, ok.mensagem);
  assert.ok(ok.resumo.some((l) => l[0] === 'Efeito na conta corrente' && /R\$ 100,00 entram/.test(l[1])));
  assert.equal(a.escritas().length, 0);
});

test('B2: baixa confere saldo em aberto e situação; prévia com saldo antes/depois; lista sem botões para título fechado', () => {
  const a = montar(); a.saldo = 400;
  const r = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 150, data: '2026-11-16' } });
  assert.equal(r.ok, true, r.mensagem);
  assert.ok(r.resumo.some((l) => l[0] === 'Saldo em aberto' && /Saldo antes: R\$ 400,00 · Esta baixa: R\$ 150,00 · Saldo depois: R\$ 250,00 \(baixa parcial\)/.test(l[1])));
  const mais = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 400.02, data: '2026-11-16' } });
  assert.equal(mais.ok, false); assert.match(mais.mensagem, /passa do saldo em aberto do título, que é R\$ 400,00/);
  a.saldo = null;
  const sem = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 10, data: '2026-11-16' } });
  assert.equal(sem.ok, false); assert.match(sem.mensagem, /saldo em aberto deste título/);
  a.saldo = 400;
  for (const sit of ['PAGO', 'RECEBIDO', 'LIQUIDADO', 'CANCELADO']) {
    a.titulo.status_titulo = sit;
    const x = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 10, data: '2026-11-16' } });
    assert.equal(x.ok, false, sit); assert.match(x.mensagem, /não é baixado de novo pelo SGO\+/);
  }
  const l = a.f('OmieOps_apiListar', 'wanessa', { tipo: 'receber', situacao: '' });
  assert.equal(l.itens[0].fechado, true);
  const ui = fs.readFileSync(path.join(PASTA, 'JS_Omie_Operacoes.html'), 'utf8');
  assert.match(ui, /i\.fechado \? '<span class="cadx-sub">Sem ação: título/);
  assert.equal(a.escritas().length, 0);
});

test('B3: Editar recusa título com rateio ou pago e envia ao Omie só o campo que mudou', () => {
  const a = montar();
  const base = { acao: 'editar', tipo: 'receber', id: 101, dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'NF-001', vencimento: '2026-11-20', valor: '1000' } };
  a.titulo.categorias = [{ codigo_categoria: '1.01', percentual: 60 }, { codigo_categoria: '1.02', percentual: 40 }];
  let r = a.f('OmieOps_apiPrevia', 'wanessa', base); assert.equal(r.ok, false); assert.match(r.mensagem, /rateio/);
  delete a.titulo.categorias; a.titulo.distribuicao = [{ cCodDep: 'D1', nPerDep: 100 }];
  r = a.f('OmieOps_apiPrevia', 'wanessa', base); assert.equal(r.ok, false); assert.match(r.mensagem, /rateio/);
  delete a.titulo.distribuicao; a.titulo.status_titulo = 'RECEBIDO';
  r = a.f('OmieOps_apiPrevia', 'wanessa', base); assert.equal(r.ok, false); assert.match(r.mensagem, /não é alterado pelo SGO\+/);
  a.titulo.status_titulo = 'EMABERTO';
  r = a.f('OmieOps_apiPrevia', 'wanessa', base); assert.equal(r.ok, false); assert.match(r.mensagem, /Nenhum campo foi alterado/);
  const mudou = JSON.parse(JSON.stringify(base)); mudou.dados.vencimento = '2026-11-30';
  r = a.f('OmieOps_apiPrevia', 'wanessa', mudou); assert.equal(r.ok, true, r.mensagem);
  assert.ok(r.resumo.some((x) => x[0] === 'Campos alterados' && /^Vencimento, Previsão\./.test(x[1])));
  const c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: r.token }); assert.equal(c.ok, true, c.mensagem);
  const env = a.escritas()[0]; assert.equal(env.call, 'AlterarContaReceber');
  assert.deepEqual(Object.keys(env.param).sort(), ['codigo_lancamento_omie', 'data_previsao', 'data_vencimento']);
});

test('B4: categorias só do tipo do título, sem inativas, grupos e transferências; a prévia confere de novo no servidor', () => {
  const a = montar();
  const pagar = a.f('OmieOps_apiApoios', 'wanessa', { tipo: 'categorias', natureza: 'pagar' });
  assert.deepEqual(pagar.itens.map((i) => i.id), ['2.03', '2.10']);
  const receber = a.f('OmieOps_apiApoios', 'wanessa', { tipo: 'categorias', natureza: 'receber' });
  assert.deepEqual(receber.itens.map((i) => i.id), ['1.01']);
  const errada = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'X', referencia: 'REF-X', vencimento: '2026-12-01', valor: 10 } });
  assert.equal(errada.ok, false); assert.match(errada.mensagem, /não é de despesa/);
  const inativa = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 12, categoria: '2.09', contaId: 5, documento: 'X', referencia: 'REF-Y', vencimento: '2026-12-01', valor: 10 } });
  assert.equal(inativa.ok, false); assert.match(inativa.mensagem, /inativa no Omie/);
  const certa = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 12, categoria: '2.03', contaId: 5, documento: 'X', referencia: 'REF-Z', vencimento: '2026-12-01', valor: 10, observacao: 'linha 1\nlinha | 2' } });
  assert.equal(certa.ok, true, certa.mensagem);
  assert.ok(certa.resumo.some((l) => l[0] === 'Observação' && l[1] === 'linha 1 | linha   2'), 'M4: quebra de linha vira " | " e o "|" digitado sai');
});

test('B5: recusa clara do Omie = nada feito (volta a pendente e libera); sem resposta = incerto, com "Envios a conferir"', () => {
  const a = montar();
  const criar = (ref) => ({ acao: 'criar', tipo: 'receber', dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'NF-9', referencia: ref, vencimento: '2026-12-01', valor: 10 } });
  let p = a.f('OmieOps_apiPrevia', 'wanessa', criar('REF-B5'));
  a.falhas.IncluirContaReceber = [{ faultstring: 'ERROR: Categoria não cadastrada!', faultcode: 'SOAP-ENV:Client-103' }];
  let c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /Categoria não cadastrada/); assert.match(c.mensagem, /Nada foi feito no Omie/);
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token }); // a mesma prévia, depois de o Omie aceitar
  assert.equal(c.ok, true, c.mensagem);
  // sem resposta: incerto, travado, e aparece em "Envios a conferir"
  p = a.f('OmieOps_apiPrevia', 'wanessa', criar('REF-B5-2'));
  a.falhas.IncluirContaReceber = ['transporte'];
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /pode ter sido processada/); assert.match(c.mensagem, /Envios a conferir/);
  assert.equal(a.f('OmieOps_apiPrevia', 'wanessa', criar('REF-B5-2')).ok, false, 'a mesma operação fica travada');
  const inc = a.f('OmieOps_apiIncertos', 'wanessa', {});
  assert.equal(inc.ok, true); assert.equal(inc.itens.length, 1); assert.match(inc.itens[0].descricao, /Novo lançamento · a receber · documento NF-9/);
  assert.equal(a.f('OmieOps_apiIncertos', 'tiago', {}).ok, false, 'fora do sigilo não vê');
  const curto = a.f('OmieOps_apiResolverIncerto', 'wanessa', { chave: inc.itens[0].chave, desfecho: 'nao_feito', motivo: 'curto' });
  assert.equal(curto.ok, false); assert.match(curto.mensagem, /pelo menos 10 letras/);
  const res = a.f('OmieOps_apiResolverIncerto', 'wanessa', { chave: inc.itens[0].chave, desfecho: 'nao_feito', motivo: 'Título não aparece em Contas a receber no Omie' });
  assert.equal(res.ok, true, res.mensagem); assert.equal(res.itens.length, 0);
  assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.RESULTADO === 'INCERTO_CONFERIDO' && /não foi feito/.test(x.DETALHE)));
  const de_novo = a.f('OmieOps_apiPrevia', 'wanessa', criar('REF-B5-2')); assert.equal(de_novo.ok, true, 'liberado depois da conferência');
  // faturamento: recusa clara apaga o marcador; marcador incerto antigo pode ser conferido
  a.props['OMIEFAT_OP_' + 'a'.repeat(64)] = JSON.stringify({ estado: 'enviado', data: '2026-11-15T10:00:00.000Z' });
  const inc2 = a.f('OmieOps_apiIncertos', 'wanessa', {});
  assert.ok(inc2.itens.some((x) => x.origem === 'Faturamento e notas' && /registro antigo/.test(x.descricao)));
  assert.equal(a.f('OmieOps_apiResolverIncerto', 'wanessa', { chave: 'OMIEFAT_OP_' + 'a'.repeat(64), desfecho: 'feito', motivo: 'Nota aparece autorizada no Omie' }).ok, true);
  assert.equal(JSON.parse(a.props['OMIEFAT_OP_' + 'a'.repeat(64)]).estado, 'concluido');
  const fonte = fs.readFileSync(path.join(PASTA, 'SGO_Omie_Faturamento.js'), 'utf8');
  assert.match(fonte, /if \(eEnvio && eEnvio\.omieRecusado\) \{ props\.deleteProperty\(op\);/);
});

test('B6: CNPJ da empresa em Chaves e senhas (aberto, sem valor, com ajuda e dígito verificador)', () => {
  const a = montar();
  const item = a.ctx.CHV_ITENS.find((i) => i.chave === 'OMIE_EMPRESA_CNPJ');
  assert.ok(item); assert.equal(item.grupo, 'Omie'); assert.equal(item.tipo, 'aberto'); assert.match(item.ajuda, /14 números/);
  assert.equal(a.ctx.Chaves_validarValor_(item, fmt(EMPRESA)), EMPRESA);
  assert.throws(() => a.ctx.Chaves_validarValor_(item, EMPRESA.slice(0, 13) + ((Number(EMPRESA[13]) + 1) % 10)), /dígitos verificadores/);
  assert.throws(() => a.ctx.Chaves_validarValor_(item, '11111111111111'), /dígitos verificadores/);
  delete a.props.OMIE_EMPRESA_CNPJ;
  const r = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Falta o CNPJ da empresa em Administração > Chaves e senhas > Omie/);
});

test('B7: recepção documental aceita XML de até 1 MB, o token não guarda o XML e a confirmação confere o mesmo arquivo', () => {
  const a = montar();
  const linhas = [], db = { getSheetByName: (n) => (n === 'FIN_OMIE_NOTAS' && linhas.length ? folha : null), insertSheet: () => folha };
  const folha = { appendRow: (r) => linhas.push(r), setFrozenRows: () => {}, getLastRow: () => linhas.length, getRange: (r, c, nr, nc) => ({ getValues: () => linhas.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc)) }) };
  const getDB = a.ctx.SGO_DATA.getDB; a.ctx.SGO_DATA.getDB = () => db;
  try {
    const grande = nfe({ itens: 700 });
    assert.ok(grande.length > 40000 && grande.length < 1000000, 'XML de compra com muitos itens: ' + grande.length);
    const p = a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: grande, tipo: 'compra' });
    assert.equal(p.ok, true, p.mensagem); assert.equal(p.resumo.quantidadeItens, 700);
    const guardado = Object.values(a.cache).find((v) => String(v).includes('"sha"'));
    assert.ok(guardado && !guardado.includes('<nfeProc'), 'a prévia guarda o resumo SHA-256, não o XML');
    assert.equal(a.f('OmieFat_apiGuardarDocumento', 'wanessa', { token: p.token, confirmacao: 'CONFIRMAR', xml: nfe() }).ok, false, 'outro arquivo é recusado');
    const g = a.f('OmieFat_apiGuardarDocumento', 'wanessa', { token: p.token, confirmacao: 'CONFIRMAR', xml: grande });
    assert.equal(g.ok, true, g.mensagem);
    const doc = JSON.parse(linhas[1][9]);
    assert.ok(!linhas[1][9].includes('<nfeProc') && /^[0-9a-f]{64}$/.test(doc.xmlSha256), 'a tabela guarda o SHA-256 e os campos, não o XML');
  } finally { a.ctx.SGO_DATA.getDB = getDB; }
  assert.equal(a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: 'x'.repeat(1000001), tipo: 'compra' }).ok, false);
});

test('B8: NFS-e confere o tomador, uma nota por arquivo, líquido calculado (nunca o bruto) e chave prestador+município+número', () => {
  const a = montar();
  const outra = a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: abrasf({ tomador: OUTRA }), tipo: 'nfse' });
  assert.equal(outra.ok, false); assert.match(outra.mensagem, /tomador desta NFS-e não é a empresa/);
  const duas = a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: abrasf({ duas: true }), tipo: 'nfse' });
  assert.equal(duas.ok, false); assert.match(duas.mensagem, /mais de uma NFS-e/);
  const ok = a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: abrasf(), tipo: 'nfse' });
  assert.equal(ok.ok, true, ok.mensagem); assert.equal(ok.resumo.valor, 1837); assert.equal(ok.resumo.chave, 'NFSE-' + PREST + '-5208707-789');
  const dif = a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: abrasf({ liquido: '2000.00' }), tipo: 'nfse' });
  assert.equal(dif.ok, false); assert.match(dif.mensagem, /valor líquido/);
  // o mesmo documento com espaços diferentes tem a mesma chave
  const outraForma = a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml: abrasf().replace(/></g, '>\n  <'), tipo: 'nfse' });
  assert.equal(outraForma.resumo.chave, ok.resumo.chave);
});

test('B9: busca de cliente ou fornecedor no Omie por CNPJ e por nome, com cidade/UF e inativo; fora do sigilo não busca', () => {
  const a = montar();
  a.clientes.push({ codigo_cliente_omie: 12, razao_social: 'HOSPITAL FICTICIO S.A.', nome_fantasia: 'Hospital', cnpj_cpf: fmt(OUTRA), cidade: 'GOIANIA (GO)', estado: 'GO', inativo: 'N', tags: [{ tag: 'Cliente' }] },
    { codigo_cliente_omie: 13, razao_social: 'HOSPITAL ANTIGO LTDA', cnpj_cpf: fmt(FORN), estado: 'GO', inativo: 'S', tags: [] });
  const porDoc = a.f('OmieCad_apiBuscar', 'wanessa', { texto: OUTRA });
  assert.equal(porDoc.ok, true); assert.equal(porDoc.itens.length, 1); assert.equal(porDoc.itens[0].documento, fmt(OUTRA)); assert.equal(porDoc.itens[0].uf, 'GO');
  assert.equal(a.omie.at(-1).param.clientesFiltro.cnpj_cpf, fmt(OUTRA));
  const porNome = a.f('OmieCad_apiBuscar', 'wanessa', { texto: 'hospital' });
  assert.equal(porNome.itens.length, 2); assert.equal(porNome.itens.find((i) => i.id === '13').inativo, true);
  assert.equal(a.f('OmieCad_apiBuscar', 'wanessa', { texto: 'ab' }).ok, false);
  const fora = a.f('OmieCad_apiBuscar', 'tiago', { texto: OUTRA }); assert.equal(fora.ok, false); assert.match(fora.mensagem, /sigiloso/);
});

// ------------------------------------------------------------------------------------------------ seção 2: cadastro no Omie
test('(a) cadastro: procura por CNPJ antes, IncluirCliente com SGO-<CNPJ> e tag; nunca Upsert; código guardado no SGO+', () => {
  const a = montar();
  a.tabelas.CMP_FORNECEDORES = [{ ID: 'f1', DOCUMENTO: FORN, RAZAO_SOCIAL: 'PECAS FICTICIAS LTDA', ENDERECO: 'Rua Ficticia, 100', CIDADE: 'Goiania', UF: 'GO', EMAIL_PEDIDOS: 'pedidos@ficticio.test', TELEFONE: '(62) 3333-4444', ATIVO: 'SIM' }];
  const p = a.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'fornecedor', origem: 'manual', dados: { documento: fmt(FORN) } });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.acao, 'incluir');
  assert.ok(p.resumo.some((l) => l[0] === 'Razão social' && l[1] === 'PECAS FICTICIAS LTDA' && /Fornecedores de Compras/.test(l[2])), 'origem de cada campo');
  assert.ok(p.resumo.some((l) => l[0] === 'Código de integração' && l[1] === 'SGO-' + FORN));
  assert.equal(a.escritas().length, 0, 'a prévia não grava');
  assert.equal(a.f('OmieCad_apiConfirmar', 'fabio', { token: p.token }).ok, false, 'token é da sessão de quem preparou');
  const c = a.f('OmieCad_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, true, c.mensagem); assert.match(c.mensagem, /Cadastrado no Omie/); assert.match(c.mensagem, /Fornecedores de Compras/);
  const env = a.escritas(); assert.equal(env.length, 1); assert.equal(env[0].call, 'IncluirCliente');
  assert.equal(env[0].param.codigo_cliente_integracao, 'SGO-' + FORN); assert.equal(env[0].param.cnpj_cpf, fmt(FORN)); assert.deepEqual(env[0].param.tags, [{ tag: 'Fornecedor' }]);
  assert.equal(env[0].param.estado, 'GO'); assert.equal(env[0].param.email, 'pedidos@ficticio.test');
  assert.equal(a.tabelas.CMP_FORNECEDORES[0].OMIE_CODIGO, c.codigo);
  assert.ok(!a.omie.some((x) => /^Upsert/.test(x.call)), 'nunca UpsertCliente');
  assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.RESULTADO === 'CADASTRO_OMIE' && !x.DETALHE.includes(FORN)), 'registro sem o documento inteiro');
  // de novo: já cadastrado com a tag, nada a fazer
  const j = a.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'fornecedor', origem: 'manual', dados: { documento: FORN } });
  assert.equal(j.ok, true); assert.equal(j.jaCadastrado, true); assert.equal(j.token, undefined);
});

test('(a) cadastro: já existe sem a tag = AlterarCliente com as tags somadas; inativo, duplicado, CNPJ errado e o da empresa são recusados', () => {
  const a = montar();
  a.clientes.push({ codigo_cliente_omie: 70, razao_social: 'PECAS FICTICIAS LTDA', cnpj_cpf: fmt(FORN), inativo: 'N', tags: [{ tag: 'Cliente' }] });
  const p = a.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'fornecedor', origem: 'manual', dados: { documento: FORN, razao: 'X' } });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.acao, 'tag');
  const c = a.f('OmieCad_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(c.ok, true, c.mensagem);
  const env = a.escritas()[0]; assert.equal(env.call, 'AlterarCliente'); assert.equal(env.param.codigo_cliente_omie, 70);
  assert.deepEqual(env.param.tags, [{ tag: 'Cliente' }, { tag: 'Fornecedor' }]); assert.deepEqual(Object.keys(env.param).sort(), ['codigo_cliente_omie', 'tags']);
  const b = montar();
  b.clientes.push({ codigo_cliente_omie: 71, razao_social: 'X', cnpj_cpf: fmt(FORN), inativo: 'S', tags: [] });
  let r = b.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'fornecedor', origem: 'manual', dados: { documento: FORN, razao: 'X' } });
  assert.equal(r.ok, false); assert.match(r.mensagem, /inativo/);
  b.clientes.push({ codigo_cliente_omie: 72, razao_social: 'X', cnpj_cpf: fmt(OUTRA), inativo: 'N', tags: [] }, { codigo_cliente_omie: 73, razao_social: 'Y', cnpj_cpf: fmt(OUTRA), inativo: 'N', tags: [] });
  r = b.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'cliente', origem: 'manual', dados: { documento: OUTRA, razao: 'X' } });
  assert.equal(r.ok, false); assert.match(r.mensagem, /2 cadastros ativos/);
  r = b.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'cliente', origem: 'manual', dados: { documento: FORN.slice(0, 13) + '0', razao: 'X' } });
  if (FORN.slice(-1) !== '0') { assert.equal(r.ok, false); assert.match(r.mensagem, /não confere/); }
  r = b.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'cliente', origem: 'manual', dados: { documento: EMPRESA, razao: 'X' } });
  assert.equal(r.ok, false); assert.match(r.mensagem, /própria empresa/);
  r = b.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'cliente', origem: 'manual', dados: { documento: '00000000000000', razao: 'X' } });
  assert.equal(r.ok, false);
  r = b.f('OmieCad_apiPrevia', 'tiago', { tipo: 'cliente', origem: 'manual', dados: { documento: PREST, razao: 'X' } });
  assert.equal(r.ok, false); assert.match(r.mensagem, /sigiloso/);
  assert.equal(b.escritas().length, 0);
});

test('(a) cadastro: gravação desligada não envia; razão social longa vai cortada com aviso; recusa do Omie = nada feito', () => {
  const a = montar({ gravacao: false });
  const longa = 'EMPRESA DE SERVICOS FICTICIOS DE MANUTENCAO E CALIBRACAO DE EQUIPAMENTOS LTDA';
  const p = a.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'cliente', origem: 'manual', dados: { documento: PREST, razao: longa } });
  assert.equal(p.ok, true, p.mensagem); assert.ok(p.avisos.some((x) => /aceita 60/.test(x)));
  const c = a.f('OmieCad_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(c.ok, false); assert.match(c.mensagem, /gravação pelo SGO\+ ainda está desligada/);
  assert.equal(a.escritas().length, 0);
  a.props.OMIE_GRAVACAO_LIGADA = '1';
  a.falhas.IncluirCliente = [{ faultstring: 'ERROR: A característica "Segmento" é obrigatória.', faultcode: 'SOAP-ENV:Client-1' }];
  const r = a.f('OmieCad_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(r.ok, false); assert.match(r.mensagem, /Segmento/); assert.match(r.mensagem, /Nada foi feito no Omie/);
  const ok = a.f('OmieCad_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(ok.ok, true, ok.mensagem);
  assert.equal(a.escritas().at(-1).param.razao_social.length, 60);
});

// ------------------------------------------------------------------------------------------------ seção 3: notas recebidas
test('(b) NF-e de compra: leitura, fornecedor a cadastrar pela nota, uma conta a pagar por duplicata, idempotência pela chave', () => {
  const a = montar();
  const l = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.equal(l.ok, true, l.mensagem); assert.equal(l.fornecedor.situacao, 'nenhum'); assert.equal(l.leitura.parcelas.length, 2); assert.equal(l.bloqueios.length, 0);
  assert.equal(a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 }).ok, false, 'sem fornecedor no Omie não lança');
  // cadastro do fornecedor pelos dados da nota
  const pc = a.f('OmieCad_apiPrevia', 'wanessa', { tipo: 'fornecedor', origem: 'nota', xml: nfe(), tipoNota: 'compra' });
  assert.equal(pc.ok, true, pc.mensagem); assert.ok(pc.resumo.some((x) => x[0] === 'Razão social' && /NF-e \(emitente\)/.test(x[2])));
  assert.equal(a.f('OmieCad_apiConfirmar', 'wanessa', { token: pc.token }).ok, true);
  assert.equal(a.escritas().at(-1).param.cidade, '5208707', 'cidade pelo código IBGE da nota'); assert.equal(a.escritas().at(-1).param.optante_simples_nacional, 'S');
  const receita = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '1.01', contaId: 5 });
  assert.equal(receita.ok, false); assert.match(receita.mensagem, /não é de despesa/);
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.titulos.length, 2);
  assert.deepEqual(p.titulos.map((t) => t.referencia), ['NFE-' + CHAVE + '-001', 'NFE-' + CHAVE + '-002']);
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe({ vNF: '999.00' }) }).ok, false, 'arquivo diferente da prévia');
  const antes = a.escritas().length;
  const c = a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() });
  assert.equal(c.ok, true, c.mensagem); assert.equal(c.status, 'LANCADA');
  const env = a.escritas().slice(antes); assert.equal(env.length, 2); assert.ok(env.every((e) => e.call === 'IncluirContaPagar'));
  assert.equal(env[0].param.chave_nfe, CHAVE); assert.equal(env[0].param.numero_parcela, '001/002'); assert.equal(env[1].param.numero_parcela, '002/002');
  assert.equal(env[0].param.data_vencimento, '10/12/2026'); assert.equal(env[0].param.valor_documento, 500); assert.equal(env[0].param.numero_documento_fiscal, '4567'); assert.equal(env[0].param.numero_documento, 'NF 4567/1');
  assert.equal(env[0].param.data_emissao, '10/11/2026'); assert.match(env[0].param.observacao, /PECAS FICTICIAS LTDA \| NF 4567 série 1 \| parcela 1\/2 \| lançada pelo SGO\+/);
  const linha = (a.tabelas.FIN_OMIE_NOTAS_LANC || [])[0]; assert.equal(linha.STATUS, 'LANCADA'); assert.equal(JSON.parse(linha.TITULOS_JSON).length, 2); assert.equal(linha.CATEGORIA, '2.10');
  const de_novo = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.ok(de_novo.bloqueios.some((b) => /já foi lançada pelo SGO\+/.test(b)));
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() }).jaConfirmada, true);
  const h = a.f('OmieNota_apiHistorico', 'wanessa', {}); assert.equal(h.itens[0].situacao, 'Lançada'); assert.equal(h.itens[0].titulos.length, 2);
});

test('(b) NF-e: recusas (outra empresa, devolução, sem protocolo), duplicidade no Omie, soma diferente e nota sem título', () => {
  const a = montar(); fornecedorNoOmie(a);
  for (const [xml, re] of [[nfe({ dest: OUTRA }), /destinatário desta NF-e não é a empresa/], [nfe({ fin: '4' }), /devolução/], [nfe({ cStat: '110' }), /autorização da SEFAZ/]]) {
    const r = a.f('OmieNota_apiLer', 'wanessa', { xml, tipo: 'compra' }); assert.equal(r.ok, false); assert.match(r.mensagem, re);
  }
  a.recebimento = { cabec: { cChaveNfe: CHAVE }, parcelas: { parcelasLista: [{ nIdTitulo: 4321 }] } };
  let r = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.ok(r.bloqueios.some((b) => /Recebimento de NF-e\) com 1 título/.test(b)));
  const umMinuto = () => Object.keys(a.cache).filter((k) => /^OMIE_RESP_/.test(k)).forEach((k) => delete a.cache[k]); // a leitura do Omie fica guardada 60 s
  umMinuto();
  a.recebimento = null; a.contasPagar.push({ codigo_lancamento_omie: 3, numero_documento_fiscal: '4567', numero_documento: 'NF 4567', codigo_lancamento_integracao: '' });
  r = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.ok(r.bloqueios.some((b) => /lançada fora do SGO\+/.test(b)));
  a.contasPagar = []; umMinuto();
  const dif = nfe({ dups: [['001', '2026-12-10', '450.00'], ['002', '2027-01-10', '500.00']] });
  r = a.f('OmieNota_apiPrevia', 'wanessa', { xml: dif, tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Motivo da diferença/);
  r = a.f('OmieNota_apiPrevia', 'wanessa', { xml: dif, tipo: 'compra', categoria: '2.10', contaId: 5, motivoDiferenca: 'Desconto negociado após a emissão' });
  assert.equal(r.ok, true, r.mensagem); assert.ok(r.alertas.some((x) => /Soma das parcelas diferente/.test(x)));
  const semPag = nfe({ dups: [], tPag: '90' });
  r = a.f('OmieNota_apiPrevia', 'wanessa', { xml: semPag, tipo: 'compra' });
  assert.equal(r.ok, true, r.mensagem); assert.equal(r.semTitulo, true);
  const antes = a.escritas().length;
  const c = a.f('OmieNota_apiConfirmar', 'wanessa', { token: r.token, xml: semPag }); assert.equal(c.ok, true, c.mensagem); assert.equal(c.status, 'SEM_TITULO');
  assert.equal(a.escritas().length, antes, 'registrada sem título: nada vai ao Omie');
  const semDup = nfe({ dups: [], chave: CHAVE.slice(0, 43) + '9' });
  r = a.f('OmieNota_apiPrevia', 'wanessa', { xml: semDup, tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Informe o vencimento/);
});

test('(b) NF-e: se a 2ª parcela falha, a 1ª fica registrada; a nova prévia reconhece pela referência e envia só o que falta', () => {
  const a = montar(); fornecedorNoOmie(a);
  let p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 });
  a.falhas.IncluirContaPagar = [];
  const original = a.ctx.UrlFetchApp.fetch; let n = 0;
  a.ctx.UrlFetchApp.fetch = (url, op) => { const b = JSON.parse(op.payload); if (b.call === 'IncluirContaPagar' && ++n === 2) { a.omie.push({ url, call: b.call, param: b.param[0] }); return { getResponseCode: () => 500, getContentText: () => JSON.stringify({ faultstring: 'ERROR: Data de vencimento inválida', faultcode: 'SOAP-ENV:Client-7' }) }; } return original(url, op); };
  const c = a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() });
  assert.equal(c.ok, false); assert.match(c.mensagem, /^1 de 2 parcela\(s\) lançada\(s\)\. Parcela 002\/002/); assert.match(c.mensagem, /não são repetidas/);
  assert.equal(a.tabelas.FIN_OMIE_NOTAS_LANC[0].STATUS, 'LANCADA_PARCIAL');
  a.ctx.UrlFetchApp.fetch = original;
  const l = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' }); assert.equal(l.parcial, true); assert.equal(l.bloqueios.length, 0);
  p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(p.ok, true, p.mensagem); assert.deepEqual(p.titulos.map((t) => t.jaNoOmie), [true, false]);
  const antes = a.escritas().length;
  const c2 = a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() });
  assert.equal(c2.ok, true, c2.mensagem); assert.equal(a.escritas().length - antes, 1); assert.equal(a.escritas().at(-1).param.numero_parcela, '002/002');
  assert.equal(a.tabelas.FIN_OMIE_NOTAS_LANC[0].STATUS, 'LANCADA');
});

test('(b) NFS-e ABRASF: líquido calculado, retenções na observação, vencimento obrigatório, chave prestador+município+número', () => {
  const a = montar(); a.clientes.push({ codigo_cliente_omie: 60, razao_social: 'SERVICOS FICTICIOS LTDA', cnpj_cpf: fmt(PREST), inativo: 'N', tags: [{ tag: 'Fornecedor' }] });
  const l = a.f('OmieNota_apiLer', 'wanessa', { xml: abrasf(), tipo: 'nfse' });
  assert.equal(l.ok, true, l.mensagem); assert.equal(l.leitura.layout, 'ABRASF'); assert.equal(l.leitura.liquidoCalculado, 1837); assert.equal(l.leitura.totalRetencoes, 163);
  assert.ok(Object.values(l.leitura.campos).every((c) => c.lido), 'tudo lido do XML');
  assert.equal(a.f('OmieNota_apiPrevia', 'wanessa', { xml: abrasf(), tipo: 'nfse', categoria: '2.10', contaId: 5 }).ok, false, 'sem vencimento');
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: abrasf(), tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-05' });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.titulos.length, 1); assert.equal(p.titulos[0].valor, 1837); assert.equal(p.titulos[0].referencia, 'NFSE-' + PREST + '-5208707-789');
  const c = a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: abrasf() }); assert.equal(c.ok, true, c.mensagem);
  const env = a.escritas().at(-1); assert.equal(env.param.valor_documento, 1837); assert.equal(env.param.chave_nfe, undefined);
  assert.match(env.param.observacao, /Serviço R\$ 2\.000,00; retenções IR R\$ 30,00, PIS R\$ 13,00, COFINS R\$ 60,00, CSLL R\$ 20,00, ISS R\$ 40,00; título pelo líquido/);
});

test('(b) NFS-e Padrão Nacional: chave de 50 dígitos, ISS retido pelo tomador, PIS/COFINS não retidos', () => {
  const a = montar(); a.clientes.push({ codigo_cliente_omie: 61, razao_social: 'CONSULTORIA FICTICIA SA', cnpj_cpf: fmt(PREST), inativo: 'N', tags: [{ tag: 'Fornecedor' }] });
  const l = a.f('OmieNota_apiLer', 'wanessa', { xml: nacional(), tipo: 'nfse' });
  assert.equal(l.ok, true, l.mensagem); assert.equal(l.leitura.layout, 'NACIONAL'); assert.equal(l.leitura.numero, '321');
  assert.equal(l.leitura.retencoes.iss, 30); assert.equal(l.leitura.retencoes.pis, 0); assert.equal(l.leitura.liquidoCalculado, 1470); assert.equal(l.leitura.diferenca, false);
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nacional(), tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-05' });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.titulos[0].referencia, 'NFSE-' + CHAVE_NAC); assert.ok(p.titulos[0].referencia.length <= 60);
});

test('(b) NFS-e de formato desconhecido: conferência manual do que não foi lido, com motivo, marcada no registro', () => {
  const a = montar(); a.clientes.push({ codigo_cliente_omie: 62, razao_social: 'PRESTADOR', cnpj_cpf: fmt(PREST), inativo: 'N', tags: [{ tag: 'Fornecedor' }] });
  const xml = '<?xml version="1.0"?><NotaDaPrefeitura><Num>55</Num><Total>500,00</Total></NotaDaPrefeitura>';
  const l = a.f('OmieNota_apiLer', 'wanessa', { xml, tipo: 'nfse' });
  assert.equal(l.ok, true, l.mensagem); assert.equal(l.leitura.layout, 'DESCONHECIDO'); assert.ok(l.leitura.faltando.length >= 7);
  assert.equal(a.f('OmieFat_apiPreviaDocumento', 'wanessa', { xml, tipo: 'nfse' }).ok, false, 'a recepção documental não aceita campo faltando');
  const manual = { numero: '55', emissao: '2026-11-10', municipio: '5208707', prestadorCnpj: PREST, prestadorNome: 'PRESTADOR', tomadorCnpj: EMPRESA, servicos: '500,00', ir: '0', pis: '0', cofins: '0', inss: '0', csll: '0', iss: '10,00', desconto: '0' };
  let p = a.f('OmieNota_apiPrevia', 'wanessa', { xml, tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-01', manual });
  assert.equal(p.ok, false); assert.match(p.mensagem, /Escreva o motivo/);
  assert.equal(a.f('OmieNota_apiPrevia', 'wanessa', { xml, tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-01', manual: Object.assign({}, manual, { tomadorCnpj: OUTRA }), motivoManual: 'Prefeitura com layout próprio; conferido no PDF' }).ok, false, 'tomador digitado precisa ser a empresa');
  p = a.f('OmieNota_apiPrevia', 'wanessa', { xml, tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-01', manual, motivoManual: 'Prefeitura com layout próprio; conferido no PDF' });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.titulos[0].valor, 490); assert.ok(p.resumo.some((x) => x[0] === 'Digitado na conferência'));
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml }).ok, true);
  assert.match(a.tabelas.FIN_OMIE_NOTAS_LANC[0].CAMPOS_MANUAIS, /numero, emissao, municipio/);
  // líquido do XML diferente do calculado: o valor a pagar é digitado
  const dif = a.f('OmieNota_apiLer', 'wanessa', { xml: abrasf({ liquido: '1900.00' }), tipo: 'nfse' });
  assert.equal(dif.leitura.diferenca, true); assert.ok(dif.leitura.faltando.includes('valor líquido'));
});

test('(b) sigilo e caixa: fora da lista ninguém lê nota; sem FIN_OMIE_LANCAR não lança; nada de valor no log', () => {
  const a = montar(); fornecedorNoOmie(a);
  const r = a.f('OmieNota_apiLer', 'tiago', { xml: nfe(), tipo: 'compra' }); assert.equal(r.ok, false); assert.match(r.mensagem, /sigiloso/);
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() }).ok, true);
  const logs = JSON.stringify(a.tabelas.LOG_SISTEMA || a.tabelas.SGO_LOG || []) + JSON.stringify(a.tabelas.FIN_OMIE_ACESSOS || []);
  assert.ok(!/500[,.]00|1\.000|R\$/.test(logs), 'sem valores no registro e no log');
  const publicas = fs.readFileSync(path.join(PASTA, 'SGO_Omie_Notas.js'), 'utf8').match(/^function (OmieNota_api\w+)/gm).concat(fs.readFileSync(path.join(PASTA, 'SGO_Omie_Cadastro.js'), 'utf8').match(/^function (OmieCad_api\w+)/gm));
  assert.ok(publicas.length >= 7 && publicas.every((f) => !/_$/.test(f)), 'funções chamadas pela tela não terminam com "_"');
});

// ------------------------------------------------------------------------------------------------ seção 5: identificação
test('(d) planilha de Compras e do Painel saem identificadas e registradas; marca vem da sessão do servidor', () => {
  const a = montar();
  const ini = a.f('Omie_apiIniciar', 'wanessa', {});
  assert.equal(ini.marca.nome, 'WANESSA FINANCEIRO TESTE'); assert.equal(ini.marca.usuario, 'wanessa'); assert.match(ini.marca.agora, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/); assert.equal(typeof ini.marca.agoraMs, 'number');
  assert.equal(a.f('Omie_apiIniciar', 'tiago', {}).marca, undefined, 'fora do sigilo nada é devolvido');
  const csv = a.f('Omie_apiCsv', 'wanessa', { nome: 'agenda.csv', conteudo: 'a;b\r\n1;2', linhas: 1 });
  assert.equal(csv.ok, true); assert.match(csv.cabecalho, /^Gerado por WANESSA FINANCEIRO TESTE \(wanessa\) em .* · código [0-9A-F]{4}-[0-9A-F]{4}$/); assert.match(csv.rodape, new RegExp(csv.codigo));
  const reg = (a.tabelas.FIN_OMIE_ACESSOS || []).find((x) => x.RESULTADO === 'CSV' && x.DETALHE.includes(csv.codigo));
  assert.ok(reg && /agenda\.csv · 1 linha\(s\)/.test(reg.DETALHE));
  assert.equal(a.f('Omie_apiCsv', 'tiago', { nome: 'x.csv', conteudo: 'a', linhas: 1 }).ok, false);
  const fonte = fs.readFileSync(path.join(PASTA, 'SGO_Compras_Financeiro.js'), 'utf8');
  assert.match(fonte, /Fin_planilhaIdentificada_\(\{ userId: eu\.id, usuario: eu\.login, nome: eu\.nome \}/);
  const r = vm.runInContext('Fin_planilhaIdentificada_({ userId: "u_fin2", usuario: "fabio", nome: "FABIO FINANCEIRO TESTE" }, { nome: "Compras - conferencia - 2026-10.csv", conteudo: "x", linhas: 3, consulta: "CmpFin_planilha" })', a.ctx);
  assert.match(r.cabecalho, /FABIO FINANCEIRO TESTE \(fabio\)/);
  assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.CONSULTA === 'CmpFin_planilha' && x.DETALHE.includes(r.codigo)));
});

// ------------------------------------------------------------------------------------------------ páginas completas (c) e (d)
function htmlCompleto() {
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
}
const COMPRAS_INI = { ok: true, nivel: 'FINANCEIRO', comprador: false, veValores: true, veFila: false, financeiro: true, podeRegras: false, gestao: false, diretoria: false, podeCartoes: true, podeConciliar: true, vePainel: true,
  eu: { id: 'u_fin', nome: 'WANESSA FINANCEIRO TESTE' }, marca: { nome: 'WANESSA FINANCEIRO TESTE', usuario: 'wanessa', agora: '16/11/2026 10:00', agoraMs: Date.now() },
  situacoes: {}, urgencias: {}, vinculos: {}, categorias: {}, categoriasFornecedor: {}, formasPagamento: { CARTAO_CREDITO: 'Cartão de crédito', BOLETO: 'Boleto', FATURADO: 'Faturado', REEMBOLSO: 'Reembolso' }, compatibilidade: {}, finSituacoes: {} };
function comprasApi(acao) {
  if (acao === 'iniciar' || acao === 'acesso') return COMPRAS_INI;
  if (acao === 'financeiro') return { ok: true, totalTxt: 'R$ 250,00', mes: '2026-11', compras: [{ id: 'p1', requisicaoId: 'r1', numero: 'PC-2026-0001', requisicao: 'REQ-2026-0001', titulo: 'Resistência 220 V', fornecedor: 'Fornecedor Fictício', vinculo: 'Interno', valorTxt: 'R$ 250,00', valorPagoTxt: 'R$ 250,00', forma: 'Cartão final 4321', pagoEm: '10/11/2026', situacaoNome: 'Aguardando conferência', obs: '' }] };
  if (acao === 'equipe') return { ok: true, equipe: [{ id: 'u_tec', nome: 'TIAGO' }] };
  return { ok: true };
}
async function abrirPagina(browser, a, largura, extra) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
    if (fn === 'Compras_api') return { ok: true, valor: comprasApi(args[1]) };
    if (/^(Omie|OmieOps|OmieFat|OmieConc|OmiePed|OmieCad|OmieNota|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
      return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test('(a)(b)(d) página completa do Painel: busca e cadastro no lançamento, nota recebida, marca d\'água e impressão identificada — 390, 320 e 1366 px', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); fs.mkdirSync(saida, { recursive: true });
  a.clientes.push({ codigo_cliente_omie: 12, razao_social: 'HOSPITAL FICTICIO S.A.', cnpj_cpf: fmt(OUTRA), cidade: 'GOIANIA', estado: 'GO', inativo: 'N', tags: [{ tag: 'Cliente' }] });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320, 1366]) {
      a.clientes = a.clientes.filter((c) => c.cnpj_cpf !== fmt(PREST)); Object.keys(a.cache).filter((k) => /^OMIE_RESP_/.test(k)).forEach((k) => delete a.cache[k]); // cada largura começa sem o cadastro
      const { page, erros } = await abrirPagina(browser, a, largura);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('omie'));
      await page.locator('#omieTela .fin-marca').waitFor({ state: 'attached', timeout: 10000 });
      const marca = await page.evaluate(() => { const m = document.querySelector('#omieTela .fin-marca'); const cs = getComputedStyle(m); return { texto: m.getAttribute('data-texto'), ponteiro: cs.pointerEvents, opacidade: Number(cs.opacity), fundo: cs.backgroundImage.slice(0, 30) }; });
      assert.match(marca.texto, /^WANESSA FINANCEIRO TESTE · wanessa · \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · SIGILOSO$/); assert.equal(marca.ponteiro, 'none'); assert.ok(marca.opacidade > 0 && marca.opacidade < 0.1); assert.match(marca.fundo, /^url\("data:image\/svg\+xml/);
      // lançamento: busca por CNPJ, nada encontrado -> Cadastrar no Omie
      await page.evaluate(() => OmieTela_abrir_('lancamentos')); await page.waitForTimeout(500);
      await page.evaluate(() => OmieOps_form_('criar')); await page.waitForSelector('#omieCadBusca');
      await page.fill('#omieCadBusca', fmt0(PREST0()));
      await page.evaluate(() => OmieCad_buscar_());
      await page.locator('#omieCadResultado button', { hasText: 'Cadastrar no Omie' }).waitFor({ timeout: 8000 });
      await page.locator('#omieCadResultado button', { hasText: 'Cadastrar no Omie' }).click();
      await page.waitForSelector('#omieCadForm');
      assert.equal(await page.inputValue('#omieCadForm [name="documento"]'), PREST0());
      await page.waitForTimeout(300);
      const dicasCad = await page.evaluate(() => Array.from(document.querySelectorAll('#omieCadForm .omie-dica')).map((d) => d.textContent));
      assert.ok(dicasCad.some((t) => /^Cadastrar como:/.test(t)) && dicasCad.some((t) => /^Razão social: o nome oficial/.test(t)) && dicasCad.some((t) => /^E-mail: cliente/.test(t)), 'explicação dos campos do cadastro');
      await page.fill('#omieCadForm [name="razao"]', 'SERVICOS FICTICIOS LTDA');
      await page.evaluate(() => OmieCad_previa_());
      await page.waitForFunction(() => document.querySelector('#omieCadPrevia table'), null, { timeout: 8000 }).catch(() => {});
      assert.ok(await page.locator('#omieCadPrevia table').count(), 'prévia do cadastro: ' + await page.locator('#omieCadAviso').innerText() + ' | ' + erros.join(' / '));
      assert.match(await page.locator('#omieCadPrevia').innerText(), /Cadastrar no Omie como Cliente[\s\S]*SGO-/);
      assert.ok(await semRolagem(page), 'cadastro sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-cadastro-omie.png'), fullPage: true });
      await page.evaluate(() => OmieCad_confirmar_());
      await page.waitForFunction(() => /Escolhido: SERVICOS FICTICIOS LTDA/.test(document.getElementById('omieCadEscolhido').textContent), null, { timeout: 8000 });
      // baixa: 19/11/2026 (auditoria) juros, multa e desconto liberados, com o aviso de como o Omie soma no banco
      await page.evaluate(() => OmieOps_form_('baixar', 101)); await page.waitForSelector('#omieOpsForm [name="juros"]');
      assert.equal(await page.evaluate(() => document.querySelector('#omieOpsForm [name="juros"]').readOnly), false);
      assert.match(await page.locator('.omie-aviso-baixa').innerText(), /valor da baixa \+ juros \+ multa − desconto/);
      // nota recebida: NFS-e ABRASF lida, fornecedor já no Omie, retenções e dicas
      await page.evaluate(() => OmieTela_abrir_('notas')); await page.waitForSelector('#omieNotaSecao');
      await page.evaluate((xml) => { document.getElementById('omieNotaTipo').value = 'nfse'; OMIE_NOTA.xml = xml; OMIE_NOTA.tipo = 'nfse'; OmieNota_lerServidor_({}); }, abrasfPagina());
      await page.locator('#omieNotaLancForm').waitFor({ timeout: 8000 });
      const nota = await page.locator('#omieNotaLeitura').innerText();
      assert.match(nota, /líquido calculado\): R\$\s?1\.837,00/); assert.match(nota, /Retenções: impostos que a empresa desconta/);
      await page.waitForTimeout(400);
      const sem = await page.evaluate(() => Array.from(document.querySelectorAll('#omieNotaSecao input, #omieNotaSecao select, #omieNotaSecao textarea')).filter((el) => el.type !== 'hidden' && el.type !== 'checkbox' && !(el.getAttribute('aria-describedby') || '').trim()).map((el) => el.name || el.id));
      assert.deepEqual(sem, [], 'nota: todo campo com explicação');
      assert.ok(await semRolagem(page), 'nota sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-nota-recebida.png'), fullPage: true });
      // impressão: a marca e o rodapé "Impresso por" saem
      await page.emulateMedia({ media: 'print' });
      const imp = await page.evaluate(() => { const r = document.querySelector('#omieTela .fin-marca-rodape'); return { mostra: getComputedStyle(r).display, texto: r.textContent, marca: getComputedStyle(document.querySelector('#omieTela .fin-marca')).display }; });
      assert.equal(imp.mostra, 'block'); assert.match(imp.texto, /^Impresso por WANESSA FINANCEIRO TESTE \(wanessa\) em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/); assert.notEqual(imp.marca, 'none');
      await page.emulateMedia({ media: 'screen' });
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});
// valores usados dentro do navegador (page.evaluate não leva funções do teste)
function PREST0() { return PREST; }
function fmt0(d) { return fmt(d); }
function abrasfPagina() { return abrasf(); }

test('(c)(d) Compras — Conferência do Financeiro, registro do pagamento, Cartões e Conciliação: explicação embaixo de cada campo e marca d\'água — 390, 320 e 1366 px', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320, 1366]) {
      const { page, erros } = await abrirPagina(browser, a, largura);
      await page.evaluate(() => Compras_render_('compras_financeiro'));
      await page.locator('#fnLista .cp-tabela').waitFor({ timeout: 8000 });
      await page.waitForTimeout(200);
      const dicas = await page.evaluate(() => ['fnMes', 'fnCartao', 'fnSit'].map((id) => { const c = document.getElementById(id).closest('.cp-campo'); const d = c && c.querySelector('.cp-ajuda-campo'); return d ? d.textContent : ''; }));
      assert.match(dicas[0], /^Mês: o mês das compras a conferir/); assert.match(dicas[1], /^Final do cartão: os 4 últimos números/); assert.match(dicas[2], /^Situação: "Aguardando conferência"/);
      assert.match(await page.locator('.cp-dica-planilha').innerText(), /^Baixar a planilha: gera um arquivo/);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.cp-dica-fin')).textAlign), 'justify');
      const m = await page.evaluate(() => { const x = document.querySelector('#conteudo .module-shell .fin-marca'); return x ? x.getAttribute('data-texto') : ''; });
      assert.match(m, /^WANESSA FINANCEIRO TESTE · wanessa · .* · SIGILOSO$/);
      assert.ok(await semRolagem(page), 'conferência sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-compras-conferencia.png'), fullPage: true });
      // janela "Divergente": o texto do campo é o da ação
      await page.evaluate(() => Cp_pedirTexto_('Divergente', 'O comprador recebe o texto.', 'O que não bate', 10, function () {}, 'Apontar'));
      assert.match(await page.locator('.atv-modal .cp-ajuda-campo').innerText(), /^O que não bate: escreva o que está errado/);
      await page.evaluate(() => document.querySelectorAll('.atv-overlay').forEach((o) => o.remove()));
      // registro do pagamento: os campos que aparecem ao trocar a forma também recebem a explicação
      await page.evaluate(() => { var ov = Cp_modal_('Registrar o pagamento', '<div class="cp-grade2">' + Cp_campo_('Valor pago (R$)', '<input type="text" id="pgValor">') + Cp_campo_('Data do pagamento', '<input type="date" id="pgData">') + '</div>' + Cp_campoPagamento_('pg') + Cp_campo_('Comprovante', '<input type="file" id="pgArq">', 'Recibo, extrato, cupom ou boleto pago.'), ''); Cp_ligarPagamento_('pg', []); var s = document.getElementById('pgForma'); s.value = 'CARTAO_CREDITO'; s.onchange(); });
      await page.waitForTimeout(150);
      const pg = await page.evaluate(() => ['pgValor', 'pgData', 'pgForma', 'pgFinal', 'pgParc', 'pgArq'].map((id) => { const c = document.getElementById(id).closest('.cp-campo'); return c.querySelector('.cp-ajuda-campo') ? c.querySelector('.cp-ajuda-campo').textContent.split(':')[0] : ''; }));
      assert.deepEqual(pg, ['Valor pago', 'Data do pagamento', 'Forma de pagamento', '4 últimos números do cartão', 'Parcelas', 'Comprovante']);
      assert.ok(await semRolagem(page), 'pagamento sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-compras-pagamento.png'), fullPage: false });
      await page.evaluate(() => document.querySelectorAll('.atv-overlay').forEach((o) => o.remove()));
      // impressão identificada também em Compras
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#conteudo .fin-marca-rodape')).display), 'block');
      await page.emulateMedia({ media: 'screen' });
      assert.deepEqual(erros.filter((e) => !/indisponível no ensaio/.test(e)), [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('(c)(d) Conciliação Caju: explicação embaixo dos campos do extrato e da configuração, marca d\'água — 390, 320 e 1366 px', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320, 1366]) {
      const { page, erros } = await abrirPagina(browser, a, largura);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-conciliacao_caju'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('conciliacao_caju'));
      await page.locator('#cjTela .fin-marca').waitFor({ state: 'attached', timeout: 10000 });
      assert.match(await page.evaluate(() => document.querySelector('#cjTela .fin-marca').getAttribute('data-texto')), /^WANESSA FINANCEIRO TESTE · wanessa · .* · SIGILOSO$/);
      await page.evaluate(() => CjT_irAba_('extrato'));
      await page.locator('#cjArq').waitFor({ timeout: 8000 });
      await page.waitForTimeout(200);
      assert.match(await page.evaluate(() => document.getElementById('cjArq').closest('label').querySelector('.vg-dica').textContent), /^Extrato do Caju \(CSV\): o arquivo de transações/);
      assert.ok(await semRolagem(page), 'extrato sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-caju-extrato.png'), fullPage: true });
      await page.evaluate(() => CjT_irAba_('config'));
      await page.waitForTimeout(800);
      const cfg = await page.evaluate(() => { const d = document.getElementById('cjCfgDepois'); const c = document.getElementById('cjCfgCat'); return { depois: d ? d.closest('label').querySelector('.vg-dica').textContent : 'sem campo', cat: c ? c.closest('label').querySelector('.vg-dica').textContent : 'sem campo' }; });
      assert.match(cfg.depois, /^Dias depois da chegada: gasto até N dias/); assert.match(cfg.cat, /^Em que saldo do Caju/, 'dica que já existia continua');
      assert.ok(await semRolagem(page), 'configuração sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-caju-configuracao.png'), fullPage: true });
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});
