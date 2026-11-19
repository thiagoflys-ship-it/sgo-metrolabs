// Financeiro v2, etapa (a) (19/11/2026): estrutura nova (17 páginas no menu, de-para das 29 abas sem perder função), Painel financeiro
// (visão da diretoria e "Meu dia") com dados simulados de números conhecidos, Empresas e bancos (cadastro, vínculo das contas, estado de
// cada banco só pelo NOME das chaves), seletores de empresa e de período, permissões (lista de sigilo; só dono e Diretoria alteram) e
// os estados sem credencial. Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_onda_a.cjs); nada sai para a rede.
// Capturas: output/financeiro-v2-20261119/etapa-a/capturas (1366, 390 e 320 px), com a faixa "DADOS SIMULADOS".
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { montarA, PASTA } = require('./_financeiro_onda_a.cjs');
const S = require('./_financeiro_simulado.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_FIN_V2 || path.join(__dirname, '../output/financeiro-v2-20261119/etapa-a/capturas');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const EXTRAS = ['SGO_Financeiro_Pagamentos.js', 'SGO_Financeiro_Espelho.js', 'SGO_Financeiro_Contas.js', 'SGO_Financeiro_V2.js'];

/** Omie simulado com conta corrente nos títulos (par = conta 5, Sicredi; ímpar = conta 6, Itaú) e duas contas correntes com banco. */
function ambiente(o) {
  o = o || {};
  const a = montarA({ foto: false, extras: EXTRAS.concat(o.extras || []), agora: '2026-11-16T10:00:00-03:00' });
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  a.contasOmie = [{ nCodCC: 5, descricao: 'Sicredi matriz', codigo_banco: '748', codigo_agencia: '0101', numero_conta_corrente: '12345-6' },
    { nCodCC: 6, descricao: 'Itaú Unibanco Prestadora', codigo_banco: '341', codigo_agencia: '0202', numero_conta_corrente: '9876-5' },
    { nCodCC: 7, descricao: 'CAIXA FILIAL', codigo_banco: '104', codigo_agencia: '0303', numero_conta_corrente: '555-1' },
    { nCodCC: 8, descricao: 'Itaú LATAM', codigo_banco: '341', inativo: 'S' }];
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      (a.chavesUsadas = a.chavesUsadas || []).push(b.app_key);
      if (b.call === 'ListarContasCorrentes') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { pagina: 1, total_de_paginas: 1, ListarContasCorrentes: a.contasOmie }); }
      if (b.call === 'ListarEmpresas') { a.omie.push({ url, call: b.call, param: p }); return o.semEmpresaOmie ? resp(500, { faultstring: 'ERROR: Não existem registros para a página [1]!', faultcode: 'SOAP-ENV:Client-5113' }) : resp(200, { pagina: 1, total_de_paginas: 1, empresas_cadastro: [{ cnpj: S.EMPRESA, razao_social: 'EMPRESA FICTICIA DE TESTE LTDA', cidade: 'GOIANIA', estado: 'GO', inscricao_estadual: '', inscricao_municipal: '' }] }); }
      const r = anterior(url, op);
      if (b.call === 'ListarMovimentos' && !p.nCodTitulo) {
        const j = JSON.parse(r.getContentText());
        (j.movimentos || []).forEach((m) => { m.detalhes.nCodCC = Number(m.detalhes.nCodTitulo) % 2 === 0 ? 5 : 6; });
        return resp(r.getResponseCode(), j);
      }
      return r;
    }
    return anterior(url, op);
  };
  a.em('2026-11-16T06:15:00-03:00'); a.limpar(); const f = a.foto(); if (!f.concluida) throw new Error('fotografia: ' + JSON.stringify(f));
  a.em('2026-11-16T10:00:00-03:00');
  return a;
}
const json = (x) => JSON.stringify(x);

test('estrutura: 17 páginas em 3 grupos no menu, cada uma das 29 abas antigas numa página (sem perder função) e o endereço antigo no Painel', () => {
  const idx = ler('Index.html');
  const mods = [...idx.matchAll(/data-mod="(fin_[a-z]+)"/g)].map((m) => m[1]);
  assert.equal(mods.length, 17, 'botões fin_* no menu');
  for (const g of ['menu-secao-financeiro"', 'menu-secao-financeiro-bancos"', 'menu-secao-financeiro-gestao"']) assert.ok(idx.includes('id="' + g), g);
  assert.match(idx, /data-mod="fin_painel"[^>]*id="menu-btn-omie"/, 'o Painel financeiro mantém o id antigo do menu');
  assert.match(idx, /data-mod="conciliacao_caju"/, 'Conciliação Caju continua no menu');
  for (const f of ['JS_Financeiro_V2_Componentes', 'JS_Financeiro_V2', 'JS_Financeiro_V2_Painel', 'JS_Financeiro_V2_Empresas']) assert.ok(idx.includes("include('" + f + "')"), f);
  assert.ok(idx.indexOf("include('JS_Comercial')") < idx.indexOf("include('JS_Financeiro_V2_Componentes')"), 'as classes cm-* vêm antes do CSS novo');
  // as abas antigas e o de-para
  const ctx = vm.createContext({});
  vm.runInContext(ler('JS_Omie_Gestao.html').replace(/^[\s\S]*?<script>/, '').replace(/<\/script>[\s\S]*$/, '').replace(/\r\n/g, '\n') + '\nthis.ABAS = OMIE_ABAS;', ctx);
  vm.runInContext(ler('JS_Financeiro_V2.html').replace(/^[\s\S]*?<script>/, '').replace(/<\/script>[\s\S]*$/, '') + '\nthis.PAGS = FIN_V2_PAGINAS;', ctx);
  const abas = ctx.ABAS.map((x) => x[0]), pags = ctx.PAGS;
  assert.equal(abas.length, 29);
  assert.equal(pags.length, 17);
  assert.deepEqual(JSON.parse(JSON.stringify(pags.map((p) => p[0]).sort())), mods.slice().sort(), 'as páginas do menu são as do de-para');
  for (const aba of abas) assert.ok(pags.some((p) => p[6].some((x) => x[0] === aba)), 'a aba antiga "' + aba + '" vive numa página nova');
  const esperado = { resumo: 'fin_painel', indicadores: 'fin_painel', pagamentos: 'fin_aprovacoes', regras: 'fin_aprovacoes', contas: 'fin_receber', lancamentos: 'fin_pagar', fixas: 'fin_pagar', espelho: 'fin_pagar',
    conciliacao: 'fin_conciliacao', cobrancas: 'fin_cobranca', regua: 'fin_cobranca', cliente: 'fin_cadastros', pedidos: 'fin_notas', produtos: 'fin_notas', servicos: 'fin_notas', notas: 'fin_notas',
    fluxo: 'fin_relatorios', resultado: 'fin_relatorios', relatorios: 'fin_relatorios', agenda: 'fin_relatorios', especialista: 'fin_relatorios', orcamento: 'fin_orcamento', provisoes: 'fin_orcamento',
    fechamento: 'fin_fechamento', recarga: 'fin_caju', trilha: 'fin_trilha', sigilo: 'fin_trilha', reajustes: 'fin_receber', comissoes: 'fin_pagar' };
  for (const [aba, pag] of Object.entries(esperado)) assert.equal(pags.filter((p) => p[6].some((x) => x[0] === aba))[0][0], pag, 'casa da aba ' + aba);
  // páginas das próximas etapas: estado em construção com o quê, quando e o que fazer
  for (const m of ['fin_bancos', 'fin_transferencias', 'fin_impostos']) { const p = pags.find((x) => x[0] === m); assert.ok(p[7] && p[7].oque && p[7].quando && p[7].enquanto, m); }
  // o endereço "omie" vira o Painel novo; a ajuda das páginas é "omie/fin_*"
  const core = ler('JS_Core.html');
  assert.match(core, /if \(mod === "omie" && typeof FinV2_render_ === "function"\) mod = "fin_painel";/);
  assert.match(core, /if \(\/\^fin_\[a-z\]\+\$\/\.test\(m\)\) return "omie\/" \+ m;/);
  const aj = ler('SGO_Ajuda_Financeiro.js');
  for (const m of mods) assert.ok(aj.includes("'omie/" + m + "'"), 'ajuda da página ' + m);
});

test('painel com dados simulados: números iguais à fotografia, nenhum Date, aprovações pendentes e "Meu dia"', () => {
  const a = ambiente();
  // um pagamento aguardando aprovação (enviado pela Wanessa)
  a.tabelas.FIN_PAG_ITENS = [{ ID: 'p1', SITUACAO: 'AGUARDANDO', VALOR: 1234.56, ENVIADO_POR_ID: 'u_fin', ENVIADO_EM: '2026-11-15T19:40:00.000Z', TITULO_OMIE: 21 }];
  const r = a.F('Fin_apiPainel', 'wanessa', { empresa: 'TODAS' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(json(r), json(JSON.parse(json(r))), 'só texto e número');
  const b = r.base;
  assert.equal(b.foto.dia, '2026-11-16'); assert.equal(b.foto.deHoje, true);
  assert.equal(b.caixa.saldo, 30000, 'saldo do resumo do Omie');
  assert.deepEqual(b.aging.faixas, { aVencer: 12800, ate30: 4000, de31a90: 3000, mais90: 2000 });
  assert.equal(b.vencidoReceber.valor, 9000); assert.equal(b.vencidoPagar.valor, 1500);
  assert.deepEqual([b.receber.hoje, b.receber.d7, b.receber.mes], [0, 800, 10800]);
  assert.deepEqual([b.pagar.hoje, b.pagar.d7, b.pagar.mes], [0, 0, 6000]);
  assert.equal(b.previsao.dias.length, 90); assert.ok(b.previsao.menor && b.previsao.alerta);
  assert.equal(b.resultado.meses.length, 6); assert.equal(b.resultado.meses[5].parcial, true);
  assert.equal(b.dre.linhas[2][0], 'Resultado de caixa');
  assert.deepEqual(b.orcamento.itens.map((x) => x.g), ['Combustível', 'Serviços de terceiros']);
  assert.ok(b.devedores[0].nome === 'Hospital Dez Fictício' && b.devedores[0].valor === 4000, 'maior devedor com nome');
  assert.equal(r.aprovacoes.qtd, 1); assert.equal(r.aprovacoes.total, 1234.56); assert.equal(r.aprovacoes.podeDecidir, false, 'a Wanessa não aprova');
  assert.equal(r.papel.diretoria, false);
  // Meu dia: a semana só com o que vence em cada dia útil e o saldo projetado
  const sem = r.meuDia.semana.dias;
  assert.deepEqual(sem.map((d) => d.dia), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-23'], 'dias úteis (20/11 é feriado nacional)');
  assert.equal(sem[3].receber, 800); assert.equal(sem[0].receber, 0, 'o vencido não entra no dia de hoje');
  assert.ok(r.meuDia.tarefas.some((t) => /aguardando o dono ou o Charles/.test(t.titulo) && t.valor === 1234.56), 'tarefa da aprovação');
  assert.ok(r.meuDia.tarefas.some((t) => /contas a pagar vencidas/.test(t.titulo)));
  assert.match(r.meuDia.cartoes.fornecedores.motivo, /etapa b/);
  // o dono decide
  const d = a.F('Fin_apiPainel', 'admin', { empresa: 'TODAS' });
  assert.equal(d.aprovacoes.podeDecidir, true); assert.equal(d.papel.diretoria, true);
  assert.equal(a.escritas().length, 0, 'nada gravado no Omie');
});

test('empresas: só dono e Diretoria gravam, CNPJ conferido, motivo de 15 letras, histórico e sugestão "conferir" do Omie da matriz', () => {
  const a = ambiente();
  const w = a.F('Fin_apiEmpresas', 'wanessa', {});
  assert.equal(w.ok, true, w.mensagem); assert.equal(w.podeEditar, false);
  // 19/11/2026: CNPJs informados pelo dono como valor inicial (dígitos conferidos); a razão social fica vazia até o dono conferir
  assert.deepEqual(w.empresas.map((e) => [e.apelido, e.cnpj, e.cnpjValido, e.razao, e.modo]), [['MATRIZ', '32.487.278/0001-21', true, '', 'PROPRIO'], ['FILIAL', '32.487.278/0002-02', true, '', 'PROPRIO'], ['PRESTADORA', '62.909.375/0001-26', true, '', 'COMPARTILHADO']]);
  // 19/11/2026: dois aplicativos no Omie (METROLAB e METROLAB'S FILIAL RJ): a Filial RJ tem Omie próprio; a prestadora vive no Omie da matriz
  assert.equal(w.empresas[1].nome, 'Filial RJ');
  assert.match(w.empresas[0].cnpjOrigem, /informado pelo dono em 19\/11\/2026/);
  const omieFilial = w.integracoes.find((i) => i.empresa === 'FILIAL' && i.banco === 'OMIE');
  assert.equal(omieFilial.estado, 'falta'); assert.deepEqual(omieFilial.faltam, ['OMIE_APP_KEY_FILIAL', 'OMIE_APP_SECRET_FILIAL']);
  assert.equal(w.integracoes.find((i) => i.empresa === 'PRESTADORA' && i.banco === 'OMIE').estado, 'compartilhado');
  assert.equal(w.sugestaoMatriz.cnpj, S.fmt(S.EMPRESA)); assert.equal(w.sugestaoMatriz.conferir, true);
  // 19/11/2026 (decisão do dono): conta sem vínculo é da Matriz; o nome que cita outra empresa ganha o selo "conferir"
  assert.deepEqual(w.contas.filter((c) => !c.inativa).map((c) => [c.id, c.empresa, c.padrao, c.conferir, c.conector, c.estado]),
    [['7', 'MATRIZ', true, 'conferir: o nome cita a Filial', 'NENHUM', 'manual'], ['6', 'MATRIZ', true, 'conferir: o nome cita a Prestadora', 'ITAU', 'falta'], ['5', 'MATRIZ', true, '', 'SICREDI', 'falta']]);
  assert.ok(w.contas.find((c) => c.id === '6').faltam.includes('ITAU_MATRIZ_CLIENT_ID'), 'chaves da Matriz');
  const neg = a.F('Fin_apiEmpresas', 'wanessa', { acao: 'salvarEmpresa', apelido: 'MATRIZ', cnpj: S.EMPRESA, regime: '', modo: 'PROPRIO', motivo: 'CNPJ conferido no cartão' });
  assert.equal(neg.ok, false); assert.match(neg.mensagem, /só ele e a Diretoria \(o Charles\)[\s\S]*Nada foi gravado/);
  assert.match(a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarEmpresa', apelido: 'MATRIZ', cnpj: '12.345.678/0001-00', regime: '', modo: 'PROPRIO', motivo: 'CNPJ conferido no cartão da Receita' }).mensagem, /não confere pelos dígitos/);
  assert.match(a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarEmpresa', apelido: 'MATRIZ', cnpj: S.EMPRESA, regime: '', modo: 'PROPRIO', motivo: 'conferido' }).mensagem, /pelo menos 15 letras/);
  const ok = a.F('Fin_apiEmpresas', 'dora', { acao: 'salvarEmpresa', apelido: 'MATRIZ', nome: 'Matriz Goiânia', razao: 'EMPRESA FICTICIA DE TESTE LTDA', cnpj: S.EMPRESA, regime: 'PRESUMIDO', cidade: 'Goiânia / GO', modo: 'COMPARTILHADO', motivo: 'CNPJ e razão conferidos no cartão da Receita' });
  assert.equal(ok.ok, true, ok.mensagem);
  const m = ok.empresas[0];
  assert.deepEqual([m.nome, m.cnpj, m.cnpjValido, m.regime, m.modo], ['Matriz Goiânia', S.fmt(S.EMPRESA), true, 'PRESUMIDO', 'PROPRIO'], 'a matriz é sempre a dona do Omie');
  assert.equal(a.tabelas.FIN_EMPRESAS.length, 1); assert.equal(a.tabelas.FIN_EMPRESAS_HIST.length, 1);
  assert.match(a.tabelas.FIN_EMPRESAS_HIST[0].DEPOIS_JSON, /PRESUMIDO/); assert.equal(a.tabelas.FIN_EMPRESAS_HIST[0].POR_NOME, 'DORA DIRETORA TESTE');
  assert.match(a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarEmpresa', apelido: 'MATRIZ', nome: 'Matriz Goiânia', razao: 'EMPRESA FICTICIA DE TESTE LTDA', cnpj: S.EMPRESA, regime: 'PRESUMIDO', cidade: 'Goiânia / GO', modo: 'PROPRIO', motivo: 'repetindo para conferir que nada muda' }).mensagem, /Nada mudou/);
  assert.ok(a.acessos().some((x) => x.RESULTADO === 'EMPRESAS' && /MATRIZ/.test(x.DETALHE)), 'alteração no registro de acessos');
  assert.equal(a.escritas().length, 0, 'nada gravado no Omie');
});

test('contas e bancos: vínculo por empresa, estado de cada banco só pelo NOME das chaves (valor nunca sai) e credencial gravada sem dizer "Ligado"', () => {
  const a = ambiente();
  assert.match(a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', vinculos: [{ id: '5', empresa: 'MATRIZ' }], motivo: 'curto' }).mensagem, /pelo menos 15 letras/);
  const r = a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', motivo: 'contas conferidas com o gerente do banco', vinculos: [{ id: '5', empresa: 'MATRIZ', apelido: 'Sicredi Matriz' }, { id: '6', empresa: 'PRESTADORA' }, { id: '7', empresa: 'FILIAL' }] });
  assert.equal(r.ok, true, r.mensagem);
  const c = (id) => r.contas.find((x) => x.id === id);
  assert.deepEqual([c('5').empresa, c('5').apelido, c('5').estado], ['MATRIZ', 'Sicredi Matriz', 'falta']);
  assert.ok(c('5').faltam.includes('SICREDI_MATRIZ_CONTA_CLIENT_ID') && c('5').faltam.includes('SICREDI_AMBIENTE'));
  assert.ok(c('6').faltam.includes('ITAU_PRESTADORA_CERT') && c('6').faltam.includes('ITAU_PRESTADORA_CHAVE_PRIVADA'));
  assert.equal(c('7').estado, 'manual', 'Caixa: sem API, arquivo OFX');
  assert.equal(a.tabelas.FIN_CONTAS_BANCO.find((x) => x.OMIE_NCODCC === '5').PREFIXO_CHAVES, 'SICREDI_MATRIZ');
  const ip = (x, e, b) => x.integracoes.find((i) => i.empresa === e && i.banco === b);
  assert.equal(ip(r, 'MATRIZ', 'OMIE').estado, 'ligado');
  assert.equal(ip(r, 'FILIAL', 'OMIE').estado, 'falta');
  assert.equal(ip(r, 'PRESTADORA', 'OMIE').estado, 'compartilhado');
  // Caju: só as chaves de sempre (Administração > Chaves e senhas > Caju), da matriz; o ambiente aparece no estado
  assert.equal(ip(r, 'PRESTADORA', 'CAJU').estado, 'naoUsa');
  assert.ok(['ligado', 'homolog'].includes(ip(r, 'MATRIZ', 'CAJU').estado)); assert.match(ip(r, 'MATRIZ', 'CAJU').texto, /(Produção|Homologação)[\s\S]*Chaves e senhas > Caju/);
  delete a.props.CAJU_CLIENT_SECRET;
  const semCaju = a.F('Fin_apiEmpresas', 'wanessa', {});
  assert.equal(ip(semCaju, 'MATRIZ', 'CAJU').estado, 'falta'); assert.deepEqual(ip(semCaju, 'MATRIZ', 'CAJU').faltam, ['CAJU_CLIENT_SECRET']);
  a.props.CAJU_CLIENT_SECRET = 'segredo-super-secreto-123';
  assert.equal(ip(r, 'MATRIZ', 'ITAU').capacidades.find((k) => k.cod === 'pagar').semApi, true, 'Itaú sem API pública de pagamento');
  // gravar as chaves do Sicredi da matriz: "Credencial gravada", conector na etapa c; nenhum valor na resposta
  const SEGREDOS = { SICREDI_AMBIENTE: 'homologacao', SICREDI_MATRIZ_CONTA_CLIENT_ID: 'id-secreto-111', SICREDI_MATRIZ_CONTA_CLIENT_SECRET: 'segredo-secreto-222', SICREDI_MATRIZ_PIX_CERT: '-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----', SICREDI_MATRIZ_PIX_CHAVE_PRIVADA: '-----BEGIN PRIVATE KEY-----\nBBB\n-----END PRIVATE KEY-----' };
  Object.assign(a.props, SEGREDOS);
  const g = a.F('Fin_apiEmpresas', 'wanessa', {});
  // 19/11/2026 (dono): cada produto do Sicredi é independente. Extrato e saldo pronto (com o certificado do Pix); Pix, boletos e Multipag não
  const sic = ip(g, 'MATRIZ', 'SICREDI'), cap = (k) => sic.capacidades.find((x) => x.cod === k);
  assert.equal(sic.estado, 'parcial');
  assert.equal(cap('extrato').ok, true); assert.equal(cap('pix').ok, false); assert.equal(cap('boleto').ok, false); assert.equal(cap('pagar').ok, false);
  assert.deepEqual(cap('boleto').faltam, ['SICREDI_MATRIZ_COB_API_KEY', 'SICREDI_MATRIZ_COB_CODIGO_ACESSO', 'SICREDI_MATRIZ_COOPERATIVA', 'SICREDI_MATRIZ_POSTO', 'SICREDI_MATRIZ_BENEFICIARIO'], 'boletos só pedem as chaves deles');
  assert.match(sic.texto, /Saldo e extrato: credencial gravada · Pix \(cobrança e recebidos\): falta credencial/);
  assert.ok(!/Ligado/.test(sic.texto));
  // só os boletos (sem nenhum certificado): o produto Boletos fica pronto sozinho
  Object.assign(a.props, { SICREDI_MATRIZ_COB_API_KEY: 'k', SICREDI_MATRIZ_COB_CODIGO_ACESSO: 'c', SICREDI_MATRIZ_COOPERATIVA: '0101', SICREDI_MATRIZ_POSTO: '02', SICREDI_MATRIZ_BENEFICIARIO: '123' });
  delete a.props.SICREDI_MATRIZ_PIX_CERT;
  const g2 = a.F('Fin_apiEmpresas', 'wanessa', {}), s2 = ip(g2, 'MATRIZ', 'SICREDI');
  assert.equal(s2.capacidades.find((x) => x.cod === 'boleto').ok, true); assert.equal(s2.capacidades.find((x) => x.cod === 'extrato').ok, false);
  assert.ok(s2.capacidades.find((x) => x.cod === 'extrato').faltam.includes('SICREDI_MATRIZ_CONTA_CERT e SICREDI_MATRIZ_CONTA_CHAVE_PRIVADA ou SICREDI_MATRIZ_PIX_CERT e SICREDI_MATRIZ_PIX_CHAVE_PRIVADA'));
  a.props.SICREDI_MATRIZ_PIX_CERT = SEGREDOS.SICREDI_MATRIZ_PIX_CERT;
  const tudo = json(g) + json(a.F('Fin_apiPainel', 'wanessa', {}));
  for (const v of Object.values(SEGREDOS).concat([a.props.OMIE_APP_KEY, a.props.OMIE_APP_SECRET, a.props.CAJU_CLIENT_SECRET])) assert.ok(!tudo.includes(v), 'valor de chave na resposta: ' + v.slice(0, 12));
  // a Wanessa não grava vínculo
  assert.match(a.F('Fin_apiEmpresas', 'wanessa', { acao: 'salvarContas', motivo: 'tentando mudar a conta da matriz', vinculos: [{ id: '5', empresa: 'FILIAL' }] }).mensagem, /Nada foi gravado/);
  assert.equal(a.tabelas.FIN_CONTAS_BANCO.find((x) => x.OMIE_NCODCC === '5').EMPRESA, 'MATRIZ');
  assert.equal(a.escritas().length, 0);
});

test('seletor de empresa: painel e contas por período separados pelas contas ligadas; sem contas ou sem chave, o motivo (nunca a lista inteira)', () => {
  const a = ambiente();
  a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', motivo: 'contas conferidas com o gerente do banco', vinculos: [{ id: '5', empresa: 'MATRIZ' }, { id: '6', empresa: 'PRESTADORA' }] });
  const mz = a.F('Fin_apiPainel', 'wanessa', { empresa: 'MATRIZ' });
  assert.equal(mz.base.filtro.modo, 'contas');
  assert.equal(mz.base.vencidoReceber.valor, 6000); // títulos pares (conta 5): 2 (4000) e 4 (2000); o 21 (a pagar) é ímpar
  assert.equal(mz.base.vencidoPagar.valor, 0);
  assert.equal(mz.base.caixa.saldo, null); assert.match(mz.base.caixa.motivo, /Só no consolidado/);
  assert.match(mz.base.previsao.motivo, /Só no consolidado/);
  const pr = a.F('Fin_apiPainel', 'wanessa', { empresa: 'PRESTADORA' });
  assert.equal(pr.base.vencidoPagar.valor, 1500, 'o título 21 (ímpar, conta 6) é da Prestadora');
  const fi = a.F('Fin_apiPainel', 'wanessa', { empresa: 'FILIAL' });
  // Filial RJ: Omie próprio sem chave gravada = falta credencial, com o nome das chaves
  assert.equal(fi.base.filtro.modo, 'credencial'); assert.match(fi.base.filtro.texto, /Filial RJ[\s\S]*OMIE_APP_KEY_FILIAL, OMIE_APP_SECRET_FILIAL/);
  assert.equal(fi.base.receber.hoje, undefined); assert.ok(fi.base.receber.motivo);
  // prestadora sem conta ligada (dentro do Omie da matriz): o motivo
  a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', motivo: 'conta da prestadora volta para a matriz', vinculos: [{ id: '6', empresa: 'MATRIZ' }] });
  const ps = a.F('Fin_apiPainel', 'wanessa', { empresa: 'PRESTADORA' });
  assert.equal(ps.base.filtro.modo, 'semContas'); assert.match(ps.base.filtro.texto, /Nenhuma conta corrente do Omie está ligada à Metrolabs prestadora/);
  a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', motivo: 'conta da prestadora conferida de novo', vinculos: [{ id: '6', empresa: 'PRESTADORA' }] });
  // contas por período
  const per = { tipo: 'receber', de: '01/06/2026', ate: '31/12/2026', situacao: 'abertas' };
  const todas = a.F('FinCon_apiListar', 'wanessa', Object.assign({ empresa: 'TODAS' }, per));
  const matriz = a.F('FinCon_apiListar', 'wanessa', Object.assign({ empresa: 'MATRIZ' }, per));
  assert.equal(todas.ok, true, todas.mensagem); assert.equal(todas.avisoEmpresa, '');
  assert.ok(matriz.linhas.length > 0 && matriz.linhas.every((l) => l.cc === '5'), 'só a conta da Matriz');
  assert.ok(matriz.linhas.length < todas.linhas.length);
  const filial = a.F('FinCon_apiListar', 'wanessa', Object.assign({ empresa: 'FILIAL' }, per));
  assert.equal(filial.linhas.length, 0); assert.match(filial.avisoEmpresa, /OMIE_APP_KEY_FILIAL/);
  // com as chaves da Filial RJ gravadas, Contas por período lê o Omie dela (com a chave dela) e o painel diz que vem na próxima entrega
  Object.assign(a.props, { OMIE_APP_KEY_FILIAL: 'chave-ficticia-filial', OMIE_APP_SECRET_FILIAL: 'segredo-ficticio-filial' });
  a.chavesUsadas = [];
  const filial2 = a.F('FinCon_apiListar', 'wanessa', Object.assign({ empresa: 'FILIAL', forcar: true }, per));
  assert.equal(filial2.ok, true, filial2.mensagem); assert.match(filial2.avisoEmpresa, /Omie próprio da Filial RJ/);
  assert.ok(a.chavesUsadas.includes('chave-ficticia-filial'), 'leu com a chave da filial');
  assert.equal(a.F('Fin_apiPainel', 'wanessa', { empresa: 'FILIAL' }).base.filtro.modo, 'proprio');
  assert.equal(vm.runInContext('OMIE_EMPRESA_CTX', a.ctx), '', 'o contexto volta para a matriz');
  // Omie por empresa: sem empresa (ou MATRIZ) as chaves de sempre; FILIAL sem chave diz o nome
  assert.equal(vm.runInContext('Omie_credenciais_().key', a.ctx), a.props.OMIE_APP_KEY);
  assert.equal(vm.runInContext('Omie_credenciais_("FILIAL").key', a.ctx), 'chave-ficticia-filial');
  delete a.props.OMIE_APP_KEY_FILIAL; delete a.props.OMIE_APP_SECRET_FILIAL;
  assert.throws(() => vm.runInContext('Omie_credenciais_("FILIAL")', a.ctx), /OMIE_APP_KEY_FILIAL e OMIE_APP_SECRET_FILIAL/);
  assert.equal(a.escritas().length, 0);
});

test('permissões: fora da lista de sigilo nada é lido (registro de recusa); a fotografia guarda a conta corrente no índice 11', () => {
  const a = ambiente();
  for (const fn of ['Fin_apiPainel', 'Fin_apiEmpresas']) {
    const r = a.F(fn, 'matheusgodoi', {});
    assert.equal(r.ok, false); assert.match(r.mensagem, /sigiloso/);
  }
  assert.ok(a.acessos().filter((x) => x.USUARIO_ID === 'u_mat' && x.RESULTADO === 'NEGADO').length >= 2);
  const mem = vm.runInContext('FinFoto_titulos_("2026-11-16")', a.ctx);
  assert.ok(mem.lista.every((x) => x.length === 12 && (x[11] === 5 || x[11] === 6)), 'nCodCC no índice 11');
  assert.equal(vm.runInContext('Omie_apiIniciar("s_admin").diretoria', a.ctx), true);
  assert.equal(vm.runInContext('Omie_apiIniciar("s_wanessa").diretoria', a.ctx), false);
});

test('chaves novas no /_sgo/segredos e protegidas no cofre (patch do servidor em output/financeiro-v2-20261119/etapa-a/servidor)', async () => {
  const dir = path.join(__dirname, '../output/financeiro-v2-20261119/etapa-a/servidor/novo');
  if (!fs.existsSync(path.join(dir, 'segredos.js'))) return;
  // a lista que a tela mostra: o compilado novo, com o import do cofre trocado por um simulado
  const tmp = path.join(require('node:os').tmpdir(), 'segredos-teste-' + process.pid + '.mjs');
  fs.writeFileSync(tmp, fs.readFileSync(path.join(dir, 'segredos.js'), 'utf8').replace(/^import .*$/m, 'const gravarProp = async () => {};'));
  let L;
  try { L = (await import('file:///' + tmp.split(path.sep).join('/'))).SEGREDOS; } finally { fs.unlinkSync(tmp); }
  const ch = L.map((x) => x.chave);
  assert.equal(new Set(ch).size, ch.length, 'sem chave repetida');
  for (const k of ['GEMINI_API_KEY', 'OMIE_APP_KEY', 'OMIE_APP_SECRET', 'SMTP_SENHA', 'META_WA_TOKEN']) assert.ok(ch.includes(k), 'chave antiga continua: ' + k);
  for (const e of ['MATRIZ', 'FILIAL', 'PRESTADORA']) for (const k of ['SICREDI_' + e + '_PIX_CHAVE_PRIVADA', 'SICREDI_' + e + '_CONTA_CLIENT_ID', 'SICOOB_' + e + '_CERT_PFX', 'ITAU_' + e + '_CHAVE_PRIVADA', 'SICREDI_' + e + '_COB_CODIGO_ACESSO']) assert.ok(ch.includes(k), k);
  for (const k of ['OMIE_APP_KEY_FILIAL', 'OMIE_APP_SECRET_PRESTADORA', 'SICREDI_AMBIENTE', 'SICOOB_AMBIENTE', 'ITAU_AMBIENTE', 'SERPRO_CONSUMER_KEY', 'SICREDI_MATRIZ_CONTA_CERT', 'SICREDI_MATRIZ_PAG_CHAVE_PRIVADA']) assert.ok(ch.includes(k), k);
  // 19/11/2026: a Caju fica só em Administração > Chaves e senhas > Caju (um lugar só por chave)
  assert.ok(!ch.some((k) => /^CAJU_/.test(k)), 'nenhuma chave da Caju em /_sgo/segredos');
  assert.equal(L.find((x) => x.chave === 'SICREDI_MATRIZ_PIX_CERT').tipo, 'pem'); assert.equal(L.find((x) => x.chave === 'SICOOB_FILIAL_CERT_PFX').tipo, 'pfx');
  assert.ok(L.every((x) => x.grupo), 'toda chave com grupo');
  // o padrão novo cifra chave privada, certificado .pfx, código de acesso e consumer key
  const prop = fs.readFileSync(path.join(dir, 'propSegredas.ts'), 'utf8');
  const m = /const PADRAO_SEGREDO = (\/.*\/[a-z]*);/.exec(prop); assert.ok(m, 'PADRAO_SEGREDO');
  const re = vm.runInNewContext(m[1]);
  for (const k of ['SICREDI_MATRIZ_PIX_CHAVE_PRIVADA', 'SICOOB_FILIAL_CERT_PFX', 'SICREDI_PRESTADORA_COB_CODIGO_ACESSO', 'SERPRO_CONSUMER_KEY', 'ITAU_MATRIZ_CHAVE_PRIVADA', 'SICOOB_MATRIZ_CERT_SENHA', 'OMIE_APP_KEY_FILIAL', 'CAJU_INTEGRACAO_SENHA_FILIAL']) assert.ok(re.test(k), 'cifrada: ' + k);
  for (const k of ['SICREDI_MATRIZ_COOPERATIVA', 'ITAU_MATRIZ_AGENCIA', 'SICOOB_MATRIZ_NUMERO_CLIENTE', 'FIN_FOTO_HORA']) assert.ok(!re.test(k), 'não cifrar: ' + k);
});

// ---------------------------------------------------------------------------------------------------------------------
// página completa (Playwright)
// ---------------------------------------------------------------------------------------------------------------------
async function abrirPagina(browser, a, largura, login) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = S.htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (/^(Omie|Fin_api|FinCon_api|FinCob_api|FinAg_api|FinRel_api|FinIa_api|RecargaCaju_api|Poderes_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx);
      try { return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) }; } catch (e) { return { ok: false, erro: String(e.message) }; }
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((lg) => {
    try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); localStorage.clear(); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
  return { page, erros };
}
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const marcar = (page) => page.evaluate(() => { const c = document.getElementById('conteudo'); if (c && !document.getElementById('fvSim')) c.insertAdjacentHTML('afterbegin', '<div id="fvSim" style="background:#7A5200;color:#fff;font:700 12px/1.6 sans-serif;padding:2px 10px;border-radius:4px;display:inline-block;margin:0 0 6px">DADOS SIMULADOS (teste automático)</div>'); });

test('página: 17 páginas, painel nas duas visões, empresas, contas com os seletores, abas antigas na página nova, sem rolagem lateral e sem erro (1366, 390 e 320 px)', { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const a = ambiente();
      a.tabelas.FIN_PAG_ITENS = [{ ID: 'p1', SITUACAO: 'AGUARDANDO', VALOR: 1234.56, ENVIADO_POR_ID: 'u_fin', ENVIADO_EM: '2026-11-15T19:40:00.000Z', TITULO_OMIE: 21 }];
      a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', motivo: 'contas conferidas com o gerente do banco', vinculos: [{ id: '5', empresa: 'MATRIZ', apelido: 'Sicredi Matriz' }, { id: '6', empresa: 'PRESTADORA' }] });
      const cap = (nome) => (largura === 320 ? Promise.resolve() : marcar(page).then(() => page.screenshot({ path: path.join(saida, largura + '-' + nome + '.png'), fullPage: true })));
      // ---- dono: visão da diretoria por padrão
      var { page, erros } = await abrirPagina(browser, a, largura, 'admin');
      await page.evaluate(() => abrir('omie'));
      await page.waitForSelector('#fvPainel .fv-kpi', { timeout: 15000 });
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.SGO_MODULO_ATUAL), 'fin_painel', 'o endereço antigo abre o Painel novo');
      assert.equal(await page.evaluate(() => document.querySelector('[data-omie-aba="v2_diretoria"]').getAttribute('aria-pressed')), 'true', 'dono: visão da diretoria');
      const txt = (await page.locator('#fvPainel').innerText()).replace(/ /g, ' ');
      for (const t of ['Caixa disponível agora', 'R$ 30.000,00', 'Aprovações pendentes', 'R$ 1.234,56', 'Previsão de caixa', 'Resultado por mês', 'A receber por idade', 'Inadimplência', 'Concentração', 'Despesas por categoria', 'Orçamento × realizado', 'DRE de caixa']) assert.ok(txt.includes(t), 'painel: ' + t);
      assert.ok(await page.locator('#fvGrafPrev svg').count() === 1 && await page.locator('#fvGrafRes svg').count() === 1, 'gráficos em SVG');
      assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('#omieTela .content-subtitle')).textAlign === 'justify'), 'objetivo justificado');
      assert.ok(await semRolagem(page), 'painel sem rolagem lateral em ' + largura);
      await cap('01-painel-diretoria');
      // empresa: Matriz (separada pela conta) e Filial (sem contas: o motivo)
      await page.evaluate(() => { const b = document.querySelector('#omieTela [data-fv-emp="MATRIZ"]'); if (b && b.offsetParent) b.click(); else { const s = document.getElementById('fvEmpSel'); s.value = 'MATRIZ'; s.dispatchEvent(new Event('change')); } });
      await page.waitForFunction(() => /Matriz separados pelas 2 conta/.test((document.getElementById('fvPainel') || {}).innerText || ''), null, { timeout: 10000 });
      assert.match(await page.locator('#fvPainel').innerText(), /Só no consolidado/);
      await cap('02-painel-so-matriz');
      await page.evaluate(() => { const s = document.getElementById('fvEmpSel'); s.value = 'FILIAL'; s.dispatchEvent(new Event('change')); });
      await page.waitForFunction(() => /Falta credencial desta empresa[\s\S]*OMIE_APP_KEY_FILIAL/.test((document.getElementById('fvPainel') || {}).innerText || ''), null, { timeout: 10000 });
      await page.evaluate(() => { const s = document.getElementById('fvEmpSel'); s.value = 'TODAS'; s.dispatchEvent(new Event('change')); });
      await page.waitForFunction(() => /R\$\s30\.000,00/.test((document.getElementById('fvPainel') || {}).innerText || ''), null, { timeout: 10000 });
      // as 17 páginas abrem; as das próximas etapas dizem o quê, quando e o que fazer
      const pags = await page.evaluate(() => FIN_V2_PAGINAS.map((p) => p[0]));
      for (const m of pags) {
        await page.evaluate((x) => abrir(x), m);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => FIN_V2.pagina), m);
        const t = await page.locator('#omieTela').innerText();
        assert.ok(t.trim().length > 40, m + ': página vazia');
        if (['fin_bancos', 'fin_transferencias', 'fin_impostos'].includes(m)) assert.match(t, /O que vai ter aqui[\s\S]*Quando[\s\S]*Enquanto isso/i, m + ': em construção');
        assert.ok(await semRolagem(page), m + ': rolagem lateral em ' + largura);
      }
      // Empresas e bancos (dono altera)
      await page.evaluate(() => abrir('fin_empresas'));
      await page.waitForSelector('#fvEmp .fv-emp-cartao', { timeout: 10000 });
      const te = (await page.locator('#fvEmp').innerText()).replace(/ /g, ' ');
      for (const t of ['a preencher pelo dono', '(conferir)', 'informado pelo dono em 19/11/2026', 'Filial RJ', 'Omie próprio', 'OMIE_APP_KEY_FILIAL', 'Não usa: o Caju é da matriz', 'conferir: o nome cita a Filial', 'Falta credencial', 'SICREDI_MATRIZ_CONTA_CLIENT_ID', 'Regras do Financeiro em vigor', 'Gravar os vínculos']) assert.ok(te.includes(t), 'empresas: ' + t);
      assert.ok(await semRolagem(page), 'empresas sem rolagem lateral');
      await cap('03-empresas-e-bancos-dono');
      await page.evaluate(() => document.querySelector('[data-fv-editar="FILIAL"]').click());
      await page.waitForSelector('.atv-modal #fvEmpCnpj');
      await page.fill('#fvEmpCnpj', '11.111.111/1111-11'); await page.fill('#fvEmpMotivo', 'teste de CNPJ errado na filial');
      await page.click('.atv-modal [data-fv-gravar]');
      await page.waitForFunction(() => /não confere pelos dígitos/.test((document.getElementById('fvEmpMsg') || {}).innerText || ''), null, { timeout: 10000 });
      assert.equal(await page.inputValue('#fvEmpMotivo'), 'teste de CNPJ errado na filial', 'o formulário continua preenchido depois da recusa');
      if (largura !== 320) await page.screenshot({ path: path.join(saida, largura + '-04-editar-empresa-recusa.png') });
      await page.evaluate(() => document.querySelector('.atv-modal [data-fv-fechar]').click());
      // Contas a pagar e receber: seletor de período e de empresa
      await page.evaluate(() => abrir('fin_pagar'));
      await page.waitForSelector('#finConCorpo table', { timeout: 15000 });
      assert.equal(await page.evaluate(() => document.getElementById('finConTipo').value), 'pagar', 'Contas a pagar abre em A pagar');
      await page.evaluate(() => document.querySelector('#finConPer [data-fv-per="ano"]').click());
      await page.waitForFunction(() => /01\/01\/2026/.test(document.getElementById('finConDe').value), null, { timeout: 5000 });
      await page.waitForFunction(() => /título\(s\) no período/.test(document.getElementById('finConAviso').innerText), null, { timeout: 10000 });
      await page.evaluate(() => { const s = document.getElementById('fvEmpSel'); s.value = 'PRESTADORA'; s.dispatchEvent(new Event('change')); });
      await page.waitForFunction(() => /prestadora separados pelas 1 conta/i.test(document.getElementById('finConAviso').innerText), null, { timeout: 10000 });
      assert.ok(await semRolagem(page), 'contas sem rolagem lateral');
      await cap('05-contas-a-pagar-prestadora');
      await page.evaluate(() => { const s = document.getElementById('fvEmpSel'); s.value = 'TODAS'; s.dispatchEvent(new Event('change')); });
      await page.evaluate(() => abrir('fin_receber'));
      await page.waitForSelector('#finConCorpo table', { timeout: 15000 });
      assert.equal(await page.evaluate(() => document.getElementById('finConTipo').value), 'receber');
      await cap('06-contas-a-receber');
      // abas antigas: OmieTela_abrir_ de qualquer lugar abre a página certa, a aba destacada
      for (const aba of ['lancamentos', 'conciliacao', 'regras', 'trilha', 'agenda', 'recarga', 'cliente']) {
        await page.evaluate((x) => OmieTela_abrir_(x), aba);
        await page.waitForTimeout(400);
        const st = await page.locator('[data-omie-aba="' + aba + '"]').evaluate((b) => [b.getAttribute('aria-pressed'), getComputedStyle(b).color]);
        assert.deepEqual(st, ['true', 'rgb(255, 255, 255)'], aba + ': aba destacada na página nova');
        assert.ok((await page.locator('#omieCorpo').innerText()).trim().length > 20, aba);
      }
      assert.equal(await page.evaluate(() => FIN_V2.pagina), 'fin_cadastros');
      await page.evaluate(() => abrir('fin_bancos'));
      await page.waitForSelector('#fvEmp .fv-conta', { timeout: 10000 });
      await cap('07-bancos-em-construcao');
      assert.deepEqual(erros, [], 'erros de JavaScript (dono) em ' + largura);
      await page.close();
      // ---- Wanessa: Meu dia por padrão; Empresas só consulta, com a trava
      ({ page, erros } = await abrirPagina(browser, a, largura, 'wanessa'));
      await page.evaluate(() => abrir('fin_painel'));
      await page.waitForSelector('#fvPainel .fv-tarefas', { timeout: 15000 });
      assert.equal(await page.evaluate(() => document.querySelector('[data-omie-aba="v2_dia"]').getAttribute('aria-pressed')), 'true', 'Wanessa: Meu dia');
      const td = (await page.locator('#fvPainel').innerText()).replace(/ /g, ' ');
      for (const t of ['Fazer hoje', 'aguardando o dono ou o Charles', 'Semana', 'Cobrança de hoje', 'Pendências que travam o fechamento', 'etapa b']) assert.ok(td.includes(t), 'meu dia: ' + t);
      assert.ok(await semRolagem(page), 'meu dia sem rolagem lateral');
      await cap('08-painel-meu-dia');
      await page.evaluate(() => abrir('fin_empresas'));
      await page.waitForSelector('#fvEmp .fv-trava', { timeout: 10000 });
      assert.equal(await page.locator('[data-fv-editar]').count(), 0, 'Wanessa não edita');
      assert.equal(await page.locator('#fvContasGravar').count(), 0);
      await cap('09-empresas-e-bancos-wanessa');
      assert.deepEqual(erros, [], 'erros de JavaScript (Wanessa) em ' + largura);
      await page.close();
      // ---- Matheus: fora da lista, nem o menu aparece; o endereço mostra "sem acesso"
      const p3 = await browser.newPage({ viewport: { width: largura, height: 800 } });
      const er3 = []; p3.on('pageerror', (e) => er3.push(e.message));
      const HTML = S.htmlCompleto();
      await p3.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
      await p3.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_matheusgodoi' }, a.sessoes.s_matheusgodoi) } };
        if (/^(Omie_apiIniciar|Fin_api)/.test(fn)) return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
        return { ok: false, erro: 'indisponível no ensaio: ' + fn };
      });
      await p3.addInitScript(() => { try { sessionStorage.setItem('SGO_SESSION', 's_matheusgodoi'); } catch (e) {} const c = (ok, f) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (g) => c(g, f) : k === 'withFailureHandler' ? (g) => c(ok, g) : k === 'withUserObject' ? () => c(ok, f) : (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (f) f(new Error(r.erro)); }); } }); window.google = { script: { run: c(null, null) } }; });
      await p3.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
      await p3.waitForFunction(() => typeof OMIE_INI !== 'undefined' && OMIE_INI !== null, null, { timeout: 15000 });
      assert.equal(await p3.evaluate(() => Array.from(document.querySelectorAll('#menu .menu-btn[data-mod^="fin_"]')).filter((b) => b.style.display !== 'none').length), 0, 'menu do Financeiro escondido');
      await p3.evaluate(() => abrir('fin_painel'));
      await p3.waitForSelector('#omieTela .fv-estado.permissao', { timeout: 10000 });
      assert.deepEqual(er3, []);
      await p3.close();
    }
  } finally { await browser.close(); }
});
