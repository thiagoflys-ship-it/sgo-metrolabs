'use strict';
// 16/11/2026: simulador do Omie, XMLs fictícios e página completa do Painel, copiados de tests/financeiro-completo-20261116.test.cjs
// para os testes das Regras do Financeiro (tests/financeiro-config-20261116.test.cjs).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambienteCaju, PASTA } = require('./_caju_ambiente.cjs');
const { criarXmlService } = require('./_xmlservice_teste.cjs');
const ARQUIVOS = ['SGO_Financeiro_Marca.js', 'SGO_Omie.js', 'SGO_Omie_Gestao.js', 'SGO_Omie_Operacoes.js', 'SGO_Omie_Conciliacao.js', 'SGO_Omie_Faturamento.js', 'SGO_Omie_Pedidos.js', 'SGO_Omie_Sigilo.js', 'SGO_Omie_Cadastro.js', 'SGO_Omie_Notas.js', 'SGO_Omie_Regras.js'].filter((f) => fs.existsSync(path.join(PASTA, f)));
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
  delete a.props.APROVACAO_SO_DIRETORIA; // 16/11/2026: o Financeiro roda com o padrão de produção (SIM: só o dono e a Diretoria aprovam)
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
    if (/^(Omie|OmieOps|OmieFat|OmieConc|OmiePed|OmieCad|OmieNota|OmieRegras|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
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


module.exports = { cnpj, fmt, EMPRESA, FORN, PREST, OUTRA, CHAVE, CHAVE_NAC, nfe, abrasf, nacional, montar, fornecedorNoOmie, htmlCompleto, abrirPagina, semRolagem, PASTA };
