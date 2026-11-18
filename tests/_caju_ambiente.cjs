// Ambiente de teste da Conciliação Caju (11/11/2026): o ambiente do Depósito de viagem (código real do SGO+, tabelas em memória,
// relógio controlado) mais o módulo novo (SGO_Caju*.js) e um CAJU SIMULADO no lugar do UrlFetchApp, que segue a documentação lida
// (output/deposito-viagem-20261111/ESTUDO_API_CAJU.md): token OAuth2 por password grant (JWT com a claim sponsorId, 600 s),
// 401 com token vencido ou inválido, colaboradores (listar paginado, criar com validação, arquivar, desarquivar), pedidos de
// crédito (criar em DRAFT, consultar com total e taxa, efetivar com EXISTING_BALANCE ou PIX_CODE, saldo insuficiente, cancelar)
// e o status andando no tempo (sim.avancar). Nada sai para a rede. Credenciais, CPFs e pessoas fictícios.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente: ambienteViagem, criarCompleta, PASTA } = require('./_viagem_ambiente.cjs');

// 18/11/2026 (Bloco C da onda 3 do Financeiro): a Recarga Caju da rotina carrega junto (quando existe na pasta), para a conciliação e a
// trava conjunta rodarem com ela em todos os testes do Caju e do Financeiro (regressão de conciliacao-caju e deposito-viagem com o módulo).
const ARQUIVOS_CAJU = ['SGO_Caju.js', 'SGO_Caju_Api.js', 'SGO_Caju_Colaboradores.js', 'SGO_Caju_Conciliacao.js', 'SGO_Caju_Extrato.js', 'SGO_Caju_Pedidos.js',
  'SGO_RecargaCaju.js', 'SGO_RecargaCaju_Prestacao.js', 'SGO_RecargaCaju_Relatorios.js'].filter((f) => f.indexOf('SGO_RecargaCaju') < 0 || fs.existsSync(path.join(PASTA, f)));
const CRED = { CAJU_CLIENT_ID: 'cliente-metrolabs-teste', CAJU_CLIENT_SECRET: 'segredo-super-secreto-123', CAJU_INTEGRACAO_ID: 'integracao-teste-01', CAJU_INTEGRACAO_SENHA: 'senha-integracao-999', CAJU_AMBIENTE: 'producao' };
// CPFs válidos fictícios (dígitos de conferência certos)
const CPF = { tiago: '52998224725', paulo: '11144477735', gil: '39053344705', novo: '15350946056' };
const STATUS = ['DRAFT', 'PREPROCESSING', 'PROCESSING', 'PAID', 'REDEMPTION_IN_PROGRESS', 'REDEEMED'];
const CATEGORIAS = ['MEAL', 'TRANSPORTATION', 'FOOD', 'FOOD_AID', 'CULTURE', 'HEALTH', 'EDUCATION', 'CASHEW', 'HOME_OFFICE', 'TRANSPORTATION_VOUCHER', 'FLEXIBLE'];

/** O Caju de mentira. relogio: o do ambiente (ms). */
function criarSimulador(relogio) {
  const sim = { sponsor: 'sponsor-metrolabs-0001', saldo: 1000000, taxa: 150, tokens: {}, emitidos: 0, chamadas: [], empregados: {}, pedidos: {}, falhas: [], seq: 0, tamanhoPagina: 2 };
  const jwt = (claims) => ['eyJhbGciOiJSUzI1NiJ9', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'assinatura'].join('.');
  const resp = (code, corpo) => ({ getResponseCode: () => code, getContentText: () => (corpo === undefined ? '' : typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) });
  sim.empregado = (cpf, nome, extra) => { const id = 'emp-' + cpf.slice(0, 3) + '-' + (++sim.seq) + '-0000-0000-000000000000'; sim.empregados[id] = Object.assign({ employeeId: id, cpf, fullName: nome, email: '', archived: false }, extra || {}); return id; };
  /** Faz os pedidos andarem n passos (pagos andam até REDEEMED; PIX pendente espera sim.pagarPix). */
  sim.avancar = (n) => { Object.values(sim.pedidos).forEach((p) => { for (let i = 0; i < (n || 1); i++) { const k = STATUS.indexOf(p.status); if (k > 0 && k < STATUS.length - 1) p.status = STATUS[k + 1]; } }); };
  sim.pagarPix = (id) => { const p = sim.pedidos[id]; if (p && p.status === 'PAYMENT_PENDING') p.status = 'PAID'; };
  /** Próxima chamada que bater (método e trecho do caminho) responde com a falha: 'rede' ou { code, corpo }. */
  sim.falharUmaVez = (metodo, trecho, falha) => sim.falhas.push({ metodo, trecho, falha });
  sim.fetch = (url, op) => {
    op = op || {};
    const metodo = String(op.method || 'get').toUpperCase(), u = new URL(url);
    sim.chamadas.push({ metodo, url, headers: op.headers || {}, payload: op.payload });
    const fi = sim.falhas.findIndex((f) => f.metodo === metodo && url.indexOf(f.trecho) >= 0);
    if (fi >= 0) { const f = sim.falhas.splice(fi, 1)[0].falha; if (f === 'rede') throw new Error('Address unavailable: ' + url); return resp(f.code, f.corpo); }
    // --- acesso
    if (/\/realms\/partner\/protocol\/openid-connect\/token$/.test(u.pathname)) {
      if (!/^https:\/\/auth(-staging)?\.caju\.com\.br$/.test(u.origin)) return resp(404, 'not found');
      const f = new URLSearchParams(String(op.payload || ''));
      if (op.contentType !== 'application/x-www-form-urlencoded') return resp(400, { error: 'invalid_request' });
      if (f.get('grant_type') !== 'password') return resp(400, { error: 'unsupported_grant_type' });
      if (f.get('client_id') !== CRED.CAJU_CLIENT_ID || f.get('client_secret') !== CRED.CAJU_CLIENT_SECRET) return resp(401, { error: 'invalid_client', error_description: 'Invalid client credentials' });
      if (f.get('username') !== CRED.CAJU_INTEGRACAO_ID || f.get('password') !== CRED.CAJU_INTEGRACAO_SENHA) return resp(400, { error: 'invalid_grant', error_description: 'Invalid user credentials' });
      const exp = Math.floor(relogio.agora / 1000) + 600, t = jwt({ sub: 'integracao', sponsorId: sim.sponsor, exp, n: ++sim.emitidos });
      sim.tokens[t] = exp;
      return resp(200, { access_token: t, expires_in: 600, token_type: 'Bearer' });
    }
    // --- API
    if (u.origin !== 'https://services.caju.com.br' || u.pathname.indexOf('/partners/v1/') !== 0) return resp(404, { message: 'Not found' });
    const auth = String((op.headers || {}).Authorization || ''), tk = auth.replace(/^Bearer /, '');
    if (!sim.tokens[tk] || sim.tokens[tk] * 1000 <= relogio.agora) return resp(401, { message: 'Unauthorized' });
    const p = u.pathname.replace('/partners', ''), corpo = op.payload ? JSON.parse(op.payload) : null;
    if (p === '/v1/employee' && metodo === 'GET') {
      if (u.searchParams.get('sponsorId') !== sim.sponsor) return resp(403, { message: 'Forbidden sponsor' });
      const pag = Number(u.searchParams.get('page')) || 0, tam = Math.min(Number(u.searchParams.get('size')) || 20, sim.tamanhoPagina), todos = Object.values(sim.empregados);
      return resp(200, { content: todos.slice(pag * tam, pag * tam + tam), totalPages: Math.ceil(todos.length / tam), page: pag });
    }
    if (p === '/v1/employee' && metodo === 'POST') {
      const erros = [];
      if (!corpo || corpo.sponsorId !== sim.sponsor) erros.push({ field: 'sponsorId', message: 'invalid' });
      if (!/^\d{11}$/.test(String(corpo && corpo.cpf))) erros.push({ field: 'cpf', message: 'must contain only 11 digits' });
      if (!corpo || !corpo.fullName) erros.push({ field: 'fullName', message: 'required' });
      if (corpo && corpo.phoneNumber && !/^[0-9]{2}9[0-9]{8}$/.test(corpo.phoneNumber)) erros.push({ field: 'phoneNumber', message: 'must match ^[0-9]{2}9[0-9]{8}$' });
      if (corpo && !corpo.phoneNumber && !corpo.email) erros.push({ field: 'email', message: 'at least one contact required' });
      if (erros.length) return resp(422, { message: 'Validation failed', errors: erros });
      if (Object.values(sim.empregados).some((e) => e.cpf === corpo.cpf)) return resp(409, { message: 'Employee already exists' });
      return resp(201, { employeeId: sim.empregado(corpo.cpf, corpo.fullName, { email: corpo.email || '' }) });
    }
    let m;
    if ((m = /^\/v1\/employee\/([^/]+)\/(archive|unarchive)$/.exec(p)) && metodo === 'POST') {
      const e = sim.empregados[decodeURIComponent(m[1])]; if (!e) return resp(404, { message: 'Employee not found' });
      e.archived = m[2] === 'archive'; return resp(200, {});
    }
    if (p === '/v1/voucher/allowance_order' && metodo === 'POST') {
      const erros = [];
      if (!corpo || corpo.sponsorId !== sim.sponsor) erros.push('sponsorId invalid');
      if (!corpo || !corpo.name || corpo.name.length > 27) erros.push('name must have at most 27 characters');
      const al = (corpo && corpo.allowances) || [];
      if (!al.length) erros.push('allowances required');
      al.forEach((a) => {
        const e = sim.empregados[a.employeeId];
        if (!e) erros.push('employee not found'); else if (e.archived) erros.push('employee archived');
        (a.amounts || []).forEach((x) => { if (CATEGORIAS.indexOf(x.category) < 0) erros.push('invalid category'); if (!(Number.isInteger(x.amount) && x.amount >= 1)) erros.push('amount must be >= 1 cent'); });
      });
      if (erros.length) return resp(422, { message: erros.join('; ') });
      const id = 'ord-' + String(++sim.seq).padStart(4, '0') + '-aaaa-bbbb-cccc-000000000000';
      const total = al.reduce((s, a) => s + a.amounts.reduce((t, x) => t + x.amount, 0), 0);
      sim.pedidos[id] = { allowanceOrderId: id, name: corpo.name, status: 'DRAFT', type: 'BENEFITS', allowanceTotal: total, serviceFee: sim.taxa, total: total + sim.taxa, employeeCount: al.length, createdAt: '2026-10-19T10:00:00', pixCode: null, invoice: null, allowances: al };
      return resp(201, { allowanceOrderId: id, status: 'DRAFT' });
    }
    if ((m = /^\/v1\/voucher\/allowance_order\/([^/]+)$/.exec(p))) {
      const o = sim.pedidos[decodeURIComponent(m[1])]; if (!o) return resp(404, { message: 'Allowance order not found' });
      if (metodo === 'GET') return resp(200, Object.assign({}, o, { allowances: undefined }));
      if (metodo === 'POST') {
        if (o.status !== 'DRAFT') return resp(409, { message: 'Order is not in DRAFT' });
        const ps = (corpo && corpo.paymentStrategies) || [], tipos = ps.map((x) => x.paymentType);
        if (tipos.includes('BANK_SLIP') && tipos.includes('PIX_CODE')) return resp(422, { message: 'BANK_SLIP and PIX_CODE cannot be used together' });
        const soma = ps.reduce((s, x) => s + x.amount, 0);
        if (soma !== o.total) return resp(422, { message: 'Payment amount ' + soma + ' differs from order total ' + o.total });
        if (tipos[0] === 'EXISTING_BALANCE') { if (sim.saldo < o.total) return resp(422, { message: 'Insufficient balance' }); sim.saldo -= o.total; o.status = 'PREPROCESSING'; }
        else if (tipos[0] === 'PIX_CODE') { o.status = 'PAYMENT_PENDING'; o.pixCode = '00020126580014BR.GOV.BCB.PIX0136caju-teste-' + o.allowanceOrderId.slice(4, 8) + '5204000053039865802BR6304ABCD'; }
        else o.status = 'PAYMENT_PENDING';
        o.invoice = { number: 'NF-' + o.allowanceOrderId.slice(4, 8), url: 'https://notas.caju.com.br/' + o.allowanceOrderId + '.pdf' };
        return resp(200, { allowanceOrderId: o.allowanceOrderId, status: o.status });
      }
    }
    if ((m = /^\/v1\/voucher\/allowance_order\/([^/]+)\/cancel$/.exec(p)) && metodo === 'POST') {
      const o = sim.pedidos[decodeURIComponent(m[1])]; if (!o) return resp(404, { message: 'Allowance order not found' });
      if (['DRAFT', 'PAYMENT_PENDING'].indexOf(o.status) < 0) return resp(409, { message: 'Order cannot be canceled' });
      o.status = 'CANCELED'; return resp(200, {});
    }
    return resp(404, { message: 'Not found' });
  };
  return sim;
}

function ambienteCaju(opcoes) {
  const o = opcoes || {};
  const a = ambienteViagem(o);
  for (const f of ARQUIVOS_CAJU) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  if (o.comChaves && typeof a.ctx.validarSessao !== 'function') a.ctx.validarSessao = (sid) => (a.sessoes[sid] ? { valid: true, data: a.sessoes[sid] } : { valid: false });
  if (o.comChaves) vm.runInContext(fs.readFileSync(path.join(PASTA, 'SGO_Chaves.js'), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_Chaves.js' });
  vm.runInContext('PODERES_CATALOGO_MEMO = null; Via_registrarTipos_();', a.ctx);
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  a.sim = criarSimulador(a.relogio);
  const fetchAntigo = a.ctx.UrlFetchApp.fetch;
  a.ctx.UrlFetchApp.fetch = (url, op) => (/caju\.com\.br/.test(url) ? a.sim.fetch(url, op) : fetchAntigo(url, op));
  a.credenciais = (extra) => Object.assign(a.props, CRED, extra || {});
  if (o.credenciais !== false) a.credenciais();
  // 11/11/2026 (protocolo Caju 02527150): os dois modos de carga; o padrão do sistema é MANUAL. Os testes da carga pela API
  // começam com o modo "Carga pelo Caju" já escolhido pelo Financeiro (versão 1 da configuração), salvo o.modo === 'MANUAL'.
  if (o.credenciais !== false && o.modo !== 'MANUAL') (a.tabelas.CJU_CONFIG = a.tabelas.CJU_CONFIG || []).push({ ID: 'cfg-modo', VERSAO: 1, VALOR_JSON: JSON.stringify({ modoCarga: 'API' }), MOTIVO: 'modo escolhido no teste', POR_ID: 'u_fin', POR_NOME: 'WANESSA FINANCEIRO TESTE', EM: '2026-10-19T09:00:00' });
  a.gatilhos = [];
  a.ctx.ScriptApp.newTrigger = (fn) => ({ timeBased: () => ({ everyMinutes: (n) => ({ create() { a.gatilhos.push({ fn, n }); } }), everyHours: () => ({ create() {} }) }) });
  a.ctx.ScriptApp.getProjectTriggers = () => a.gatilhos.map((g) => ({ getHandlerFunction: () => g.fn }));
  a.c = (login, acao, dados) => {
    vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
    return JSON.parse(JSON.stringify(a.ctx.CajuConc_api('s_' + login, acao, dados || {})));
  };
  a.rodar = (codigo) => vm.runInContext(codigo, a.ctx);
  /** Lista do Caju com tiago e paulo; vincula os dois pelo CPF (como a Wanessa faria). */
  a.vincularEquipe = () => {
    a.sim.empregado(CPF.tiago, 'TIAGO TECNICO TESTE', { email: 'tiago@exemplo.test' });
    a.sim.empregado(CPF.paulo, 'PAULO TECNICO TESTE', { email: 'paulo@exemplo.test' });
    a.ok(a.c('wanessa', 'lerColaboradoresCaju'));
    a.ok(a.c('wanessa', 'vincular', { usuarioId: 'u_tec', cpf: CPF.tiago }));
    a.ok(a.c('wanessa', 'vincular', { usuarioId: 'u_tec2', cpf: CPF.paulo }));
  };
  /** Solicitação aprovada (R$ 2.660,00), viagem de 26 a 29/10/2026, dinheiro com o Tiago. */
  a.aprovada = (extra) => {
    const s = criarCompleta(a, 'gil', extra);
    a.ok(a.v('gil', 'enviar', { id: s.id }));
    return a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' })).solicitacao;
  };
  a.csv = (linhas, nome) => ({ nome: nome || 'extrato-caju.csv', tipo: 'text/csv', base64: Buffer.from(linhas.join('\r\n'), 'utf8').toString('base64') });
  return a;
}

module.exports = { ambienteCaju, criarSimulador, CRED, CPF, ARQUIVOS_CAJU, PASTA, criarCompleta };
