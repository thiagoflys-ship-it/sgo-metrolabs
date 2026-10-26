/****************************************************
 * METROLABS SGO+ — COMERCIAL: IMPORTAÇÃO DO CRM ANTIGO (26/10/2026)
 *
 * Traz para o SGO+ o backup do CRM usado até 22/10/2026 (Supabase, projeto "CRM"): empresas, contatos,
 * produtos, funis, negócios, orçamentos e o histórico de atividades. Roda pelo servidor
 * (sgo_servidor/scripts/importar_crm.ts) com os dados já lidos do dump; não tem tela.
 *
 * Decisões do dono (26/10/2026):
 *  - Empresas que ainda não são clientes viram clientes no cadastro único (ORIGEM = CRM). Quem já existe
 *    (pelo CNPJ do cliente ou de uma unidade) é reaproveitado.
 *  - Negócio aberto com movimento nos últimos 60 dias continua aberto, com a próxima ação "revisar" para o
 *    vendedor (Minhas atividades). Parado há mais tempo entra como perdido por falha de acompanhamento.
 *  - Vendedores do CRM sem usuário no SGO+ passam para a Mônica Souza (o nome original fica na oportunidade).
 *  - O funil "Aluguel de Equipamentos" entra na Metodologia. Rascunho de orçamento de negócio encerrado entra
 *    como proposta cancelada (histórico); de negócio aberto, só o mais recente fica em rascunho.
 *
 * Pode rodar de novo sem duplicar: oportunidade pela ORIGEM_REF "CRM:<id>", proposta pelo número do CRM
 * (ORC-...), cliente pelo CNPJ (ou pelo nome, sem CNPJ), produto pelo código, contato pela ORIGEM "CRM:<id>".
 * Com { simular: true } só conta e aponta problemas, sem gravar.
 * Os arquivos do Storage do CRM (PDFs, assinaturas) não estão no backup e não são trazidos.
 ****************************************************/

var COMIMP_EU = { id: 'CRM_IMPORT', nome: 'Importação do CRM', perfil: 'SISTEMA', gestao: true };
var COMIMP_DIAS_ABERTO = 60;
/** Vendedor do CRM (início do nome no perfil) → login no SGO+. Os demais vão para COMIMP_LOGIN_PADRAO. */
var COMIMP_VENDEDORES = [
  { crm: /^m[oô]nica/i, login: 'monica' }, { crm: /^matheus/i, login: 'matheusgodoi' },
  { crm: /^ricardo leone/i, login: 'ricardo' }, { crm: /^charles/i, login: 'charles' }
];
var COMIMP_LOGIN_PADRAO = 'monica';
/** Motivo de perda do CRM → motivo da metodologia (os sem equivalente claro mantêm o texto do CRM). */
var COMIMP_MOTIVOS = { 'Preço alto': 'Preço ou condição de pagamento', 'Concorrente': 'Concorrente escolhido',
  'Sem orçamento': 'Sem verba no momento', 'Produto/Serviço não atende': 'Produto ou serviço indisponível ou fora de escopo' };
var COMIMP_FUNIS = { 'Produtos': 'PRODUTOS', 'Engenharia': 'ENGENHARIA', 'Aluguel de Equipamentos': 'ALUGUEL' };

function ComImp_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
/** "2025-12-08 12:30:12.31628+00" → ISO em UTC (o SGO+ converte para Brasília ao exibir). */
function ComImp_iso_(v) {
  var s = ComImp_s_(v);
  if (!s) return '';
  var d = new Date(s.replace(' ', 'T').replace(/\+00$/, 'Z').replace(/([+-]\d{2})$/, '$1:00'));
  return isNaN(d.getTime()) ? '' : d.toISOString();
}
/** Data/hora de Brasília "aaaa-mm-ddThh:mm" (formato das colunas de texto do Comercial). */
function ComImp_br_(v) { var iso = ComImp_iso_(v); return iso ? Com_iso_(iso) : ''; }
/** Registro de teste do próprio CRM: só o nome "teste" puro e o "Produto Exemplo" de demonstração ("Teste Bowie Dick" é produto de verdade). */
function ComImp_ehTeste_(nome) { return /^\s*teste\s*$|^\s*produto exemplo\s*$/i.test(ComImp_s_(nome)); }
function ComImp_num_(v) { var n = Number(ComImp_s_(v)); return isFinite(n) ? n : 0; }

function ComImp_importarCrm(dados, opcoes) {
  opcoes = opcoes || {};
  var simular = !!opcoes.simular;
  var T = function (n) { return (dados && dados[n] && dados[n].linhas) || []; };
  var rel = { simular: simular, clientes: { reaproveitados: 0, criados: 0, porUnidade: 0 }, contatos: 0, produtos: { criados: 0, existentes: 0 },
    oportunidades: { criadas: 0, existentes: 0, abertas: 0, ganhas: 0, perdidas: 0, perdidasPorParada: 0 }, propostas: { criadas: 0, existentes: 0, porSituacao: {} },
    historico: 0, contatosRegistrados: 0, atividades: 0, ignoradosTeste: [], avisos: [], funilAluguel: '' };
  var hoje = Com_hoje_(), agora = Com_agora_();
  var limiteAberto = Com_somarDias_(hoje, -COMIMP_DIAS_ABERTO);
  Com_garantirAbas_();

  // ---------- usuários (vendedores)
  var usuarios = Com_ler_(SGO_CFG.SHEETS.CAD_USUARIOS);
  var porLogin = {};
  usuarios.forEach(function (u) { if (Com_up_(u.STATUS || 'ATIVO') === 'ATIVO') porLogin[ComImp_s_(u.USUARIO).toLowerCase()] = { id: Com_s_(u.ID), nome: Com_s_(u.NOME) || Com_s_(u.USUARIO) }; });
  var padrao = porLogin[COMIMP_LOGIN_PADRAO];
  if (!padrao) throw new Error('Não foi possível importar o CRM: o usuário "' + COMIMP_LOGIN_PADRAO + '" (Mônica Souza), que recebe os negócios dos vendedores sem usuário, não está ativo no SGO+. Reative em Administração > Usuários e rode de novo.');
  var perfis = {};
  T('profiles').forEach(function (p) {
    var nome = ComImp_s_(p.full_name), alvo = null;
    COMIMP_VENDEDORES.forEach(function (v) { if (!alvo && v.crm.test(nome) && porLogin[v.login]) alvo = porLogin[v.login]; });
    perfis[p.id] = { nomeCrm: nome, sgo: alvo || padrao, original: !!alvo };
  });
  var vendedor = function (crmId) { return perfis[crmId] || { nomeCrm: '(sem vendedor no CRM)', sgo: padrao, original: false }; };

  // ---------- funil Aluguel na metodologia
  var met = Com_metodologia_();
  var funisCrm = {};
  T('funnels').forEach(function (f) { funisCrm[f.id] = COMIMP_FUNIS[ComImp_s_(f.name)] || 'PRODUTOS'; });
  if (!Com_funil_('ALUGUEL', met)) {
    var etapasAlu = T('funnel_stages').filter(function (s) { return funisCrm[s.funnel_id] === 'ALUGUEL'; })
      .sort(function (a, b) { return ComImp_num_(a.position) - ComImp_num_(b.position); })
      .map(function (s, i) { return { codigo: 'ALU_' + (i + 1), nome: ComImp_s_(s.name), probabilidade: ComImp_num_(s.probability), maxDias: 7, criterio: '', checklist: [] }; });
    if (etapasAlu.length >= 2) {
      var novaMet = Com_copia_(met);
      novaMet.funis.push({ codigo: 'ALUGUEL', nome: 'Aluguel de equipamentos', descricao: 'Locação de equipamentos (funil trazido do CRM)', etapas: etapasAlu });
      if (!simular) Com_gravarMetodologia_(novaMet, COMIMP_EU, 'Funil "Aluguel de equipamentos" trazido do CRM antigo na importação de 26/10/2026.');
      met = simular ? novaMet : Com_metodologia_();
      rel.funilAluguel = 'criado (' + etapasAlu.map(function (e) { return e.nome; }).join(' > ') + ')';
    }
  } else rel.funilAluguel = 'já existia';
  var etapaCrm = {};
  T('funnel_stages').forEach(function (s) {
    var funil = Com_funil_(funisCrm[s.funnel_id] || 'PRODUTOS', met);
    var etapas = funil ? funil.etapas : [];
    etapaCrm[s.id] = { funil: funil ? funil.codigo : 'PRODUTOS', etapa: (etapas[Math.min(ComImp_num_(s.position), etapas.length - 1)] || {}).codigo || '' };
  });

  // ---------- clientes
  var clientes = Com_ler_(SGO_CFG.SHEETS.CAD_CLIENTES), unidades = Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES);
  var cliPorCnpj = {}, cliPorNome = {}, uniPorCnpj = {};
  var nomeNorm = function (s) { return ComImp_s_(s).toUpperCase().replace(/\s+/g, ' '); };
  clientes.forEach(function (c) { var d = SGO_UTILS.onlyDigits(c.CNPJ); if (d) cliPorCnpj[d] = c; cliPorNome[nomeNorm(c.RAZAO_SOCIAL)] = c; if (c.NOME_FANTASIA) cliPorNome[nomeNorm(c.NOME_FANTASIA)] = c; });
  unidades.forEach(function (u) { var d = SGO_UTILS.onlyDigits(u.CNPJ_UNIDADE); if (d && Com_up_(u.STATUS || 'ATIVO') === 'ATIVO') uniPorCnpj[d] = u; });
  var empresas = {};
  /** Resolve (ou cria) o cliente de uma empresa { nome, cnpj, email, telefone, endereco }. */
  function clienteDe(e) {
    var cnpj = SGO_UTILS.onlyDigits(e.cnpj), nome = nomeNorm(e.nome);
    if (!nome && !cnpj) return null;
    var chave = cnpj || 'N:' + nome;
    if (empresas[chave]) return empresas[chave];
    var r = null;
    if (cnpj && cliPorCnpj[cnpj]) { r = { cliente: cliPorCnpj[cnpj], unidade: null }; rel.clientes.reaproveitados++; }
    else if (cnpj && uniPorCnpj[cnpj]) {
      var u = uniPorCnpj[cnpj], c = clientes.filter(function (x) { return Com_s_(x.ID) === Com_s_(u.CLIENTE_ID); })[0];
      if (c) { r = { cliente: c, unidade: u }; rel.clientes.porUnidade++; }
    }
    var cnpjOk = cnpj && SGO_UTILS.isCnpj(cnpj);
    // sem CNPJ válido (vazio, CPF ou dígito errado no CRM) o cliente é achado pelo nome
    if (!r && !cnpjOk && cliPorNome[nome]) { r = { cliente: cliPorNome[nome], unidade: null }; rel.clientes.reaproveitados++; }
    if (!r) {
      if (cnpj && !cnpjOk) rel.avisos.push('CNPJ inválido no CRM (' + e.cnpj + ') de ' + e.nome + ': cliente criado sem CNPJ; corrija em Cadastros > Clientes.');
      var novo = { RAZAO_SOCIAL: nome, NOME_FANTASIA: nome, CNPJ: cnpjOk ? cnpj : '', ENDERECO: ComImp_s_(e.endereco).toUpperCase(), CONTATO: '',
        EMAIL: SGO_UTILS.isEmail(ComImp_s_(e.email)) ? ComImp_s_(e.email).toLowerCase() : '', TELEFONE: SGO_UTILS.onlyDigits(e.telefone), STATUS: 'ATIVO', ORIGEM: 'CRM' };
      novo = simular ? Object.assign({ ID: 'SIM-' + chave }, novo) : SGO_DATA.insert(SGO_CFG.SHEETS.CAD_CLIENTES, novo);
      clientes.push(novo);
      if (novo.CNPJ) cliPorCnpj[novo.CNPJ] = novo;
      cliPorNome[nome] = novo;
      r = { cliente: novo, unidade: null };
      rel.clientes.criados++;
    }
    empresas[chave] = r;
    return r;
  }
  var porEmpresaCrm = {};
  T('companies').forEach(function (c) {
    if (ComImp_ehTeste_(c.name)) { rel.ignoradosTeste.push('empresa "' + c.name + '"'); return; }
    var end = [c.address, c.city, c.state, c.zip_code].map(ComImp_s_).filter(Boolean).join(' - ');
    porEmpresaCrm[c.id] = clienteDe({ nome: c.name, cnpj: c.cnpj, email: c.email, telefone: c.phone, endereco: end });
  });

  // ---------- contatos
  var contatosExist = {};
  Com_ler_(COM_ABAS.CONTATOS).forEach(function (c) { if (/^CRM:/.test(Com_s_(c.ORIGEM))) contatosExist[Com_s_(c.ORIGEM).slice(4)] = c; });
  var contatoCrm = {}, novosContatos = [];
  T('contacts').forEach(function (c) {
    if (contatosExist[c.id]) { contatoCrm[c.id] = contatosExist[c.id]; return; }
    var v = porEmpresaCrm[c.company_id] || (ComImp_s_(c.company) ? clienteDe({ nome: c.company }) : null);
    if (!v) { rel.avisos.push('Contato "' + c.name + '" sem empresa no CRM: não importado (anote no cliente certo, se ainda valer).'); return; }
    var ct = { CLIENTE_ID: Com_s_(v.cliente.ID), UNIDADE_ID: v.unidade ? Com_s_(v.unidade.ID) : '', NOME: ComImp_s_(c.name), CARGO: '', PAPEL: 'OUTRO',
      EMAIL: ComImp_s_(c.email).toLowerCase(), CELULAR: SGO_UTILS.onlyDigits(c.phone), TELEFONE: '', PRINCIPAL: '', ORIGEM: 'CRM:' + c.id,
      OBS: ComImp_s_(c.notes), STATUS: 'ATIVO', CRIADO_POR_ID: COMIMP_EU.id, CRIADO_POR_NOME: COMIMP_EU.nome, ATUALIZADO_EM: agora, CRIADO_EM: ComImp_iso_(c.created_at) };
    novosContatos.push(ct);
    contatoCrm[c.id] = ct;
  });
  if (!simular && novosContatos.length) SGO_DATA.insertMany(COM_ABAS.CONTATOS, novosContatos);
  rel.contatos = novosContatos.length;

  // ---------- produtos
  var prodExist = {};
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { prodExist[Com_up_(p.CODIGO)] = p; });
  var skus = {};
  T('products').forEach(function (p) { var k = Com_up_(p.sku); if (k) skus[k] = (skus[k] || 0) + 1; });
  var produtoCrm = {}, novosProdutos = [];
  T('products').forEach(function (p) {
    if (ComImp_ehTeste_(p.name)) { rel.ignoradosTeste.push('produto "' + p.name + '"'); return; }
    var sku = Com_up_(p.sku).replace(/\s+/g, '-').slice(0, 40);
    var codigo = sku && skus[Com_up_(p.sku)] === 1 ? sku : 'CRM-' + String(p.id).slice(0, 8).toUpperCase();
    if (prodExist[codigo]) { produtoCrm[p.id] = prodExist[codigo]; rel.produtos.existentes++; return; }
    var cat = ComImp_s_(p.category).toLowerCase();
    var desc = [ComImp_s_(p.description), ComImp_s_(p.brand) ? 'Marca: ' + ComImp_s_(p.brand) : '', ComImp_s_(p.supplier) ? 'Fornecedor: ' + ComImp_s_(p.supplier) : ''].filter(Boolean).join('\n');
    var reg = { CODIGO: codigo, NOME: Com_texto_(p.name, 200), TIPO: cat === 'servicos' || cat === 'manutencao' ? 'SERVICO' : 'PRODUTO',
      CATEGORIA: { equipamentos: 'Equipamentos', servicos: 'Serviços', pecas: 'Peças', manutencao: 'Manutenção' }[cat] || '',
      UNIDADE_MEDIDA: ComImp_s_(p.unit) || 'un.', DESCRICAO: Com_texto_(desc, 2000), PRECO: Com_r2_(ComImp_num_(p.price)),
      CUSTO: ComImp_s_(p.cost) === '' || ComImp_num_(p.cost) === 0 ? '' : Com_r2_(ComImp_num_(p.cost)), ATIVO: p.is_active === 'f' ? 'NAO' : 'SIM',
      ATUALIZADO_POR_NOME: COMIMP_EU.nome, ATUALIZADO_EM: agora, CRIADO_EM: ComImp_iso_(p.created_at) };
    novosProdutos.push(reg);
    produtoCrm[p.id] = reg;
    prodExist[codigo] = reg;
  });
  if (!simular && novosProdutos.length) SGO_DATA.insertMany(COM_ABAS.PRODUTOS, novosProdutos);
  rel.produtos.criados = novosProdutos.length;

  // ---------- oportunidades
  var oppExist = {};
  Com_ler_(COM_ABAS.OPORTUNIDADES).forEach(function (o) { if (/^CRM:/.test(Com_s_(o.ORIGEM_REF))) oppExist[Com_s_(o.ORIGEM_REF).slice(4)] = o; });
  var budgets = T('budgets'), itensPorBudget = {}, budgetsPorDeal = {};
  T('budget_items').forEach(function (i) { (itensPorBudget[i.budget_id] = itensPorBudget[i.budget_id] || []).push(i); });
  budgets.forEach(function (b) { (budgetsPorDeal[b.deal_id] = budgetsPorDeal[b.deal_id] || []).push(b); });
  var ativPorDeal = {};
  T('activities').forEach(function (a) { (ativPorDeal[a.deal_id] = ativPorDeal[a.deal_id] || []).push(a); });
  var prodNome = {};
  T('products').forEach(function (p) { prodNome[p.id] = ComImp_s_(p.name); });
  var itensDeal = {};
  T('deal_products').forEach(function (i) { (itensDeal[i.deal_id] = itensDeal[i.deal_id] || []).push(i); });
  var motivosCrm = {};
  T('loss_reasons').forEach(function (m) { motivosCrm[m.id] = ComImp_s_(m.name); });
  var oppCrm = {}, histNovos = [], regNovos = [];
  var deals = T('deals').slice().sort(function (a, b) { return ComImp_s_(a.created_at) < ComImp_s_(b.created_at) ? -1 : 1; });
  var seq = 0;
  Object.keys(oppExist).forEach(function (k) { var m = /^CRM-(\d+)$/.exec(Com_s_(oppExist[k].CODIGO)); if (m && Number(m[1]) > seq) seq = Number(m[1]); });
  deals.forEach(function (d) {
    if (ComImp_ehTeste_(d.title)) { rel.ignoradosTeste.push('negócio "' + d.title + '"'); return; }
    if (oppExist[d.id]) { oppCrm[d.id] = oppExist[d.id]; rel.oportunidades.existentes++; return; }
    // cliente: empresa do negócio; senão o cliente do orçamento mais recente
    var v = porEmpresaCrm[d.company_id] || null;
    var orcs = (budgetsPorDeal[d.id] || []).slice().sort(function (a, b) { return ComImp_s_(a.created_at) < ComImp_s_(b.created_at) ? 1 : -1; });
    for (var k = 0; !v && k < orcs.length; k++) v = clienteDe({ nome: orcs[k].client_name, cnpj: orcs[k].client_document, email: orcs[k].client_email, telefone: orcs[k].client_phone, endereco: orcs[k].client_address });
    if (!v) v = clienteDe({ nome: 'CLIENTE NÃO IDENTIFICADO (CRM)' });
    var vend = vendedor(d.assigned_to);
    var ec = etapaCrm[d.stage_id] || { funil: funisCrm[d.funnel_id] || 'PRODUTOS', etapa: '' };
    var funil = Com_funil_(ec.funil, met);
    var etapa = ec.etapa || (funil ? funil.etapas[0].codigo : '');
    var ativs = ativPorDeal[d.id] || [];
    var ultimo = [d.updated_at, d.stage_entry_date].concat(ativs.map(function (a) { return a.created_at; })).map(ComImp_br_).filter(Boolean).sort().pop() || ComImp_br_(d.created_at);
    var st = ComImp_s_(d.status).toLowerCase(), situacao = 'ABERTA', motivo = '', aprendizado = ComImp_s_(d.loss_notes);
    if (st === 'ganho') situacao = 'GANHA';
    else if (st === 'perdido') { situacao = 'PERDIDA'; var mc = motivosCrm[d.loss_reason_id] || ''; motivo = COMIMP_MOTIVOS[mc] || mc || 'Não informado no CRM'; }
    else if (ultimo.slice(0, 10) < limiteAberto) {
      situacao = 'PERDIDA'; motivo = 'Falha de acompanhamento ou oportunidade abandonada';
      aprendizado = 'Importado do CRM: negócio aberto sem movimento desde ' + Com_br_(ultimo) + ' (mais de ' + COMIMP_DIAS_ABERTO + ' dias). Se ainda vale, peça a reabertura.';
      rel.oportunidades.perdidasPorParada++;
    }
    var itens = (itensDeal[d.id] || []).map(function (i) { return '- ' + (prodNome[i.product_id] || 'item') + ': ' + i.quantity + ' x ' + Com_moeda_(ComImp_num_(i.unit_price)); });
    var obs = 'Importado do CRM em ' + Com_brDia_(hoje) + '. Vendedor no CRM: ' + vend.nomeCrm + (vend.original ? '' : ' (sem usuário no SGO+; passou para ' + vend.sgo.nome + ')') + '.' +
      (itens.length ? '\nProdutos do negócio no CRM:\n' + itens.slice(0, 40).join('\n') + (itens.length > 40 ? '\n(+' + (itens.length - 40) + ' itens)' : '') : '');
    var ct = d.contact_id ? contatoCrm[d.contact_id] : null;
    if (ct && Com_s_(ct.CLIENTE_ID) !== Com_s_(v.cliente.ID)) ct = null;
    seq++;
    var o = {
      CODIGO: 'CRM-' + ('000' + seq).slice(-4), TITULO: Com_texto_(d.title, 200) || 'Negócio do CRM', CLIENTE_ID: Com_s_(v.cliente.ID), CLIENTE_NOME: Com_s_(v.cliente.NOME_FANTASIA) || Com_s_(v.cliente.RAZAO_SOCIAL),
      UNIDADE_ID: v.unidade ? Com_s_(v.unidade.ID) : '', UNIDADE_NOME: v.unidade ? Com_s_(v.unidade.NOME_UNIDADE) : '', CONTATO_ID: ct ? Com_s_(ct.ID) : '', CONTATO_NOME: ct ? Com_s_(ct.NOME) : '',
      EQUIPAMENTOS_IDS: '', FUNIL: funil ? funil.codigo : ec.funil, ETAPA: etapa, ORIGEM: /licita/i.test(d.title) ? 'Licitação' : 'Outro',
      VALOR_ESTIMADO: Com_r2_(ComImp_num_(d.value)), CHANCE: 'MEDIA', PREVISAO_FECHAMENTO: ComImp_s_(d.expected_close_date).slice(0, 10),
      RESPONSAVEL_ID: vend.sgo.id, RESPONSAVEL_NOME: vend.sgo.nome, SITUACAO: situacao, QUALIFICACAO_JSON: '{}', MOTIVO_PERDA: motivo, APRENDIZADO_PERDA: Com_texto_(aprendizado, 2000),
      ETAPA_DESDE: ComImp_br_(d.stage_entry_date) || ComImp_br_(d.created_at), ULTIMO_CONTATO_EM: ultimo, TENTATIVAS_SEM_RESPOSTA: 0,
      PROXIMA_ACAO: '', PROXIMA_ACAO_TIPO: '', PROXIMA_ACAO_EM: '', ATIVIDADE_ID: '',
      GANHA_EM: situacao === 'GANHA' ? ComImp_br_(d.updated_at) : '', PERDIDA_EM: situacao === 'PERDIDA' ? (st === 'perdido' ? ComImp_br_(d.updated_at) : agora) : '',
      ORIGEM_REF: 'CRM:' + d.id, OBSERVACOES: Com_texto_(obs, 3000), CRIADO_POR_ID: vend.sgo.id, CRIADO_POR_NOME: vend.sgo.nome, ATUALIZADO_EM: agora,
      CRIADO_EM: ComImp_iso_(d.created_at), CRITERIOS_JSON: '{}'
    };
    if (situacao === 'ABERTA') {
      o.PROXIMA_ACAO = 'Revisar a oportunidade trazida do CRM: confirmar com o cliente se ainda vale e marcar o próximo passo';
      o.PROXIMA_ACAO_TIPO = 'LIGACAO';
      o.PROXIMA_ACAO_EM = Com_somarDiasUteis_(hoje, 1) + 'T10:00';
    }
    if (!simular) o = SGO_DATA.insert(COM_ABAS.OPORTUNIDADES, o);
    else o.ID = 'SIM-OPO-' + d.id;
    oppCrm[d.id] = o;
    rel.oportunidades.criadas++;
    rel.oportunidades[{ ABERTA: 'abertas', GANHA: 'ganhas', PERDIDA: 'perdidas' }[situacao]]++;
    histNovos.push({ ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: o.ID, TIPO: 'IMPORTACAO', DE: '', PARA: situacao, TEXTO: 'Trazida do CRM antigo (situação no CRM: ' + (st || 'aberto') + ').',
      USUARIO_ID: COMIMP_EU.id, USUARIO_NOME: COMIMP_EU.nome, DATA: agora });
    ativs.forEach(function (a) {
      var tipo = ComImp_s_(a.type).toLowerCase(), texto = [ComImp_s_(a.title), ComImp_s_(a.description)].filter(Boolean).join(': ');
      var quem = vendedor(a.created_by);
      if (tipo === 'ligacao' || tipo === 'reuniao') {
        regNovos.push({ OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: tipo === 'ligacao' ? 'LIGACAO' : 'REUNIAO', RESPONDEU: '', RESUMO: Com_texto_(texto, 2000),
          CONTATO_ID: o.CONTATO_ID, CONTATO_NOME: o.CONTATO_NOME, ESTRATEGIA: '', USUARIO_ID: quem.sgo.id, USUARIO_NOME: quem.nomeCrm, DATA: ComImp_br_(a.scheduled_at || a.created_at), CRIADO_EM: ComImp_iso_(a.created_at) });
      } else {
        histNovos.push({ ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: o.ID, TIPO: tipo === 'tarefa' ? 'TAREFA_CRM' : 'NOTA_CRM', DE: '', PARA: a.completed === 't' ? 'Concluída' : '',
          TEXTO: Com_texto_(texto, 4000), USUARIO_ID: quem.sgo.id, USUARIO_NOME: quem.nomeCrm, DATA: ComImp_br_(a.created_at), CRIADO_EM: ComImp_iso_(a.created_at) });
      }
    });
  });

  // ---------- propostas (orçamentos)
  var propExist = {};
  Com_ler_(COM_ABAS.PROPOSTAS).forEach(function (p) { propExist[Com_up_(p.NUMERO)] = p; });
  var catalogo = {};
  Com_ler_(COM_ABAS.PRODUTOS).concat(novosProdutos).forEach(function (p) { catalogo[Com_s_(p.ID)] = p; });
  var rascunhoMantido = {}, novasProps = [];
  budgets.slice().sort(function (a, b) { return ComImp_s_(a.created_at) < ComImp_s_(b.created_at) ? 1 : -1; }).forEach(function (b) {
    var numero = Com_up_(b.budget_number) || 'ORC-CRM-' + String(b.id).slice(0, 8).toUpperCase();
    if (propExist[numero]) { rel.propostas.existentes++; return; }
    var o = oppCrm[b.deal_id];
    if (!o) { rel.avisos.push('Orçamento ' + numero + ' sem negócio importado: não trazido.'); return; }
    var itens = (itensPorBudget[b.id] || []).sort(function (x, y) { return ComImp_num_(x.position) - ComImp_num_(y.position); }).map(function (i, k) {
      var p = i.product_id ? produtoCrm[i.product_id] : null;
      return { ordem: k + 1, produtoId: p ? Com_s_(p.ID) : '', codigo: p ? Com_s_(p.CODIGO) : '', tipo: Com_s_(i.item_type) === 'service' ? 'SERVICO' : (p ? Com_up_(p.TIPO) || 'PRODUTO' : 'PRODUTO'),
        descricao: Com_texto_(ComImp_s_(i.description) || ComImp_s_(i.service_name) || (p ? Com_s_(p.NOME) : 'Item'), 400), detalhe: Com_texto_(i.notes, 800), equipamentoId: '', equipamentoTexto: '',
        unidade: p ? Com_s_(p.UNIDADE_MEDIDA) || 'un.' : 'un.', quantidade: ComImp_num_(i.quantity), precoUnitario: Com_r2_(ComImp_num_(i.unit_price)),
        precoTabela: 0, custoUnitario: null }; // preço do orçamento antigo vale como digitado (sem "desconto" contra o catálogo atual)
    });
    var calc = ComP_calcular_(itens, ComImp_num_(b.discount_amount));
    var st = ComImp_s_(b.status).toLowerCase(), sit;
    if (st === 'approved') sit = 'APROVADA';
    else if (st === 'rejected') sit = 'RECUSADA';
    else if (ComImp_s_(b.sent_at)) sit = 'ENVIADA';
    else if (Com_up_(o.SITUACAO) === 'ABERTA' && !rascunhoMantido[o.ID]) { sit = 'RASCUNHO'; rascunhoMantido[o.ID] = true; }
    else sit = 'CANCELADA';
    var p = {
      NUMERO: numero, REVISAO: 0, OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, CLIENTE_NOME: o.CLIENTE_NOME, UNIDADE_ID: o.UNIDADE_ID, UNIDADE_NOME: o.UNIDADE_NOME,
      CONTATO_ID: o.CONTATO_ID, CONTATO_NOME: o.CONTATO_NOME, RESPONSAVEL_ID: o.RESPONSAVEL_ID, RESPONSAVEL_NOME: o.RESPONSAVEL_NOME, MODELO: itens.length ? ComP_modeloDosItens_(itens) : 'SERVICOS',
      TITULO: Com_texto_(b.title, 200) || o.TITULO, ESCOPO: Com_texto_(b.notes, 4000), APRESENTACAO: met.proposta.apresentacao, ITENS_JSON: JSON.stringify(itens),
      CONDICOES_JSON: JSON.stringify(met.proposta.condicoes), VALIDADE_DIAS: '', VALIDA_ATE: ComImp_s_(b.expiration_date).slice(0, 10),
      SUBTOTAL: calc.subtotal, DESCONTO_GERAL: calc.descontoGeral, TOTAL: Com_r2_(ComImp_num_(b.total_amount)) || calc.total, DESCONTO_PCT: calc.descontoPct, MARGEM_PCT: '', CUSTO_TOTAL: '',
      SITUACAO: sit, DESCONTO_SITUACAO: 'DENTRO', ENVIADA_EM: ComImp_br_(b.sent_at), RESPOSTA_EM: sit === 'APROVADA' ? ComImp_br_(b.signed_at || b.updated_at) : (sit === 'RECUSADA' ? ComImp_br_(b.rejected_at || b.updated_at) : ''),
      RESPOSTA_POR_NOME: ComImp_s_(b.signature_name), MOTIVO_RECUSA: Com_texto_(b.rejection_reason, 1000),
      // pedido de antes do SGO+: não entra como "pedido aprovado sem passagem aos setores"
      PEDIDO_SITUACAO: sit === 'APROVADA' ? 'CONCLUIDO' : '', PASSAGEM_CONCLUIDA_EM: sit === 'APROVADA' ? ComImp_br_(b.updated_at) : '',
      CANCELADA_MOTIVO: sit === 'CANCELADA' ? 'Rascunho do CRM antigo de negócio encerrado (ou substituído por orçamento mais recente).' : '',
      ATUALIZADO_EM: agora, CRIADO_POR_ID: o.RESPONSAVEL_ID, CRIADO_EM: ComImp_iso_(b.created_at)
    };
    novasProps.push(p);
    rel.propostas.porSituacao[sit] = (rel.propostas.porSituacao[sit] || 0) + 1;
  });
  if (!simular && novasProps.length) SGO_DATA.insertMany(COM_ABAS.PROPOSTAS, novasProps);
  rel.propostas.criadas = novasProps.length;
  if (!simular && histNovos.length) SGO_DATA.insertMany(COM_ABAS.HISTORICO, histNovos);
  if (!simular && regNovos.length) SGO_DATA.insertMany(COM_ABAS.CONTATOS_REG, regNovos);
  rel.historico = histNovos.length;
  rel.contatosRegistrados = regNovos.length;

  // ---------- próxima ação das abertas (Minhas atividades do vendedor, sem e-mail nem aviso de "nova atividade")
  Object.keys(oppCrm).forEach(function (k) {
    var o = oppCrm[k];
    if (Com_up_(o.SITUACAO) !== 'ABERTA' || Com_s_(o.ATIVIDADE_ID) || !Com_s_(o.PROXIMA_ACAO)) return;
    rel.atividades++;
    if (simular) return;
    var atvId = Com_criarAtividade_({ comoPessoa: { id: o.RESPONSAVEL_ID, nome: o.RESPONSAVEL_NOME, login: '', perfil: 'COMERCIAL' }, responsavelId: o.RESPONSAVEL_ID,
      titulo: 'Revisar oportunidade do CRM: ' + Com_s_(o.CLIENTE_NOME), descricao: o.PROXIMA_ACAO + '\nOportunidade ' + o.CODIGO + ': ' + o.TITULO +
        '\nAo falar com o cliente, registre o contato na oportunidade (Comercial > Oportunidades): a atividade é concluída e você marca o próximo passo.',
      prazo: o.PROXIMA_ACAO_EM, prioridade: 'Normal', clienteId: o.CLIENTE_ID, unidadeId: o.UNIDADE_ID, modulo: 'comercial', moduloNome: 'Comercial',
      porQue: 'Oportunidade trazida do CRM antigo ainda aberta: toda oportunidade aberta tem próxima ação com data.', onde: 'Comercial > Oportunidades > ' + o.CODIGO, como: o.PROXIMA_ACAO, restrita: true });
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ATIVIDADE_ID: atvId });
  });
  return rel;
}
