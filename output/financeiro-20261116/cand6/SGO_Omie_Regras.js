/**
 * Regras do Financeiro configuráveis (16/11/2026, pedido do dono: "deixa tudo organizado de forma que possa ser configurado").
 * Cada decisão pendente do dono virou uma configuração com o padrão seguro (o comportamento que já existia):
 * - OMIE_NFE_COMPRA_DESTINO (Chaves e senhas > Regras do Financeiro): FINANCEIRO (padrão) | FINANCEIRO_FISCAL. O caminho fiscal
 *   (ImportarNFe de compra) ainda não existe: a opção só faz a tela avisar; o lançamento continua só no financeiro.
 * - OMIE_NFSE_RETENCOES: OBSERVACAO (padrão: título pelo líquido, retenções na observação) | CAMPOS_OMIE (título pelo valor do
 *   serviço e as retenções nos campos retem_* / valor_* da conta a pagar do Omie; a confirmar na primeira operação acompanhada).
 * - OMIE_ALCADA_SEGUNDA_CONFIRMACAO e OMIE_ALCADA_APROVACAO (valores em R$; sem valor = desligadas): acima do valor, a confirmação
 *   pede o valor digitado de novo / a prévia espera a aprovação de OUTRA conta da lista de sigilo (nunca de quem preparou).
 *   16/11/2026 (decisão do dono): "nenhum colaborador tem poder de aprovar nada financeiro; quem aprova é sempre o dono e a
 *   Diretoria". Aprovar ou recusar = estar na lista de sigilo E ser o dono do sistema (Chaves_ehDonoUsuario_) ou da Diretoria
 *   (perfil ou área DIRETORIA): OmieRegras_podeAprovar_. O Financeiro prepara e nunca aprova; o dono aprova o que a Diretoria
 *   preparou e vice-versa (quem preparou continua sem aprovar a própria).
 *   Valem para baixa (a pagar e a receber), lançamento e alteração de conta a pagar e lançamento de nota recebida.
 * - De-para de categorias (OMIE_CATEGORIAS_DEPARA, JSON validado), editado só no Painel financeiro > Regras do Financeiro, com
 *   motivo e histórico (FIN_OMIE_REGRAS_HIST). Sugere a categoria; a pessoa sempre escolhe na tela e a prévia confere.
 *   Quem altera: quem tem a caixa FIN_OMIE_LANCAR (e está na lista de sigilo). Justificativa: é quem lança e conhece o plano de
 *   contas no dia a dia; a Diretoria vê o histórico com o motivo e o registro de acessos. O dono está na lista e também pode.
 * Nada de valor vai para o log; o histórico guarda só categorias e motivos.
 */
var OMIE_REGRAS_DEPARA_PROP = 'OMIE_CATEGORIAS_DEPARA';
var OMIE_REGRAS_HIST_ABA = 'FIN_OMIE_REGRAS_HIST';
var OMIE_REGRAS_HIST_COLUNAS = ['ID', 'EM', 'USUARIO_ID', 'USUARIO', 'NOME', 'REGRA', 'ANTES', 'DEPOIS', 'MOTIVO'];
var OMIE_DEPARA_TIPOS = { NFE_COMPRA: 'NF-e de compra (conta a pagar)', NFSE: 'NFS-e recebida (conta a pagar)', RECEBER_PROPOSTA: 'Conta a receber de proposta aprovada' };
var OMIE_DEPARA_NATUREZA = { NFE_COMPRA: 'pagar', NFSE: 'pagar', RECEBER_PROPOSTA: 'receber' };
var OMIE_APROVACAO_JANELA_MS = 24 * 3600000; // tempo para outra pessoa aprovar; depois de aprovada, 10 minutos para confirmar
var OMIE_PREVIA_MS = 10 * 60000;

function OmieRegras_s_(v, max) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 300); }
function OmieRegras_prop_(k) { try { return OmieRegras_s_(PropertiesService.getScriptProperties().getProperty(k)); } catch (e) { return ''; } }
function OmieRegras_destinoNfe_() { return OmieRegras_prop_('OMIE_NFE_COMPRA_DESTINO').toUpperCase() === 'FINANCEIRO_FISCAL' ? 'FINANCEIRO_FISCAL' : 'FINANCEIRO'; }
function OmieRegras_retencoes_() { return OmieRegras_prop_('OMIE_NFSE_RETENCOES').toUpperCase() === 'CAMPOS_OMIE' ? 'CAMPOS_OMIE' : 'OBSERVACAO'; }
/** "10.000,00", "R$ 10000", "10000.5" -> número; inválido -> NaN. */
function OmieRegras_dinheiro_(v) {
  var t = String(v === null || v === undefined ? '' : v).replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!t) return NaN;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(Number(t) * 100) / 100;
}
function OmieRegras_moeda_(n) { return typeof OmieOps_moeda_ === 'function' ? OmieOps_moeda_(n) : 'R$ ' + Number(n || 0).toFixed(2).replace('.', ','); }
function OmieRegras_alcadas_() {
  var a = OmieRegras_dinheiro_(OmieRegras_prop_('OMIE_ALCADA_SEGUNDA_CONFIRMACAO')), b = OmieRegras_dinheiro_(OmieRegras_prop_('OMIE_ALCADA_APROVACAO'));
  return { segunda: a > 0 ? a : 0, aprovacao: b > 0 ? b : 0 };
}

// ------------------------------------------------------------------------------------------------ alçadas
/** Marca a operação com as alçadas que valem para o valor e acrescenta as linhas da prévia. Devolve null se nenhuma vale. */
/** 16/11/2026 (decisão do dono): só o dono do sistema e a Diretoria (dentro da lista de sigilo) aprovam ou recusam. */
function OmieRegras_podeAprovar_(eu) {
  if (!eu || typeof Omie_contaNoSigilo_ !== 'function' || !Omie_contaNoSigilo_(eu.userId || eu.id)) return false;
  if (typeof SGO_aprovacaoSoDiretoria_ === 'function' && !SGO_aprovacaoSoDiretoria_()) return true; // NAO: qualquer outra pessoa da lista, como antes
  return typeof OmieSig_ehDiretoria_ === 'function' ? !!OmieSig_ehDiretoria_(eu) : String(eu.perfil || '').toUpperCase() === 'DIRETORIA';
}
var OMIE_MSG_SO_DIRETORIA_APROVA = 'Você não aprova nem recusa operações do Financeiro: por decisão do dono, só o dono do sistema e a Diretoria (dentro da lista de sigilo) decidem as operações acima da alçada; o Financeiro e os demais colaboradores preparam. Nada foi alterado. Peça ao dono ou à Diretoria para decidir em Painel financeiro > Regras do Financeiro > Aprovações.';
function OmieRegras_alcada_(valor, eu, resumo) {
  var a = OmieRegras_alcadas_(), v = Math.round((Number(valor) || 0) * 100) / 100;
  var r = { valor: v, segunda: a.segunda > 0 && v > a.segunda, aprovacao: a.aprovacao > 0 && v > a.aprovacao,
    preparadoPorId: OmieRegras_s_(eu && (eu.userId || eu.id), 80), preparadoPorNome: OmieRegras_s_(eu && (eu.nome || eu.usuario), 80), aprovadoPorId: '', aprovadoPorNome: '', aprovadoEm: '', recusa: '' };
  if (!r.segunda && !r.aprovacao) return null;
  if (r.aprovacao) resumo.push(['Aprovação', 'Valor acima de ' + OmieRegras_moeda_(a.aprovacao) + ': o dono do sistema ou a Diretoria precisa aprovar no Painel financeiro (Regras do Financeiro > Aprovações) antes de confirmar. Quem preparou não aprova a própria operação.']);
  if (r.segunda) resumo.push(['Segunda confirmação', 'Valor acima de ' + OmieRegras_moeda_(a.segunda) + ': para confirmar, digite o valor de novo.']);
  return r;
}
/** Na confirmação: aprovação de outra pessoa e o valor digitado de novo. Erro público com o quê, por quê e o que fazer. */
function OmieRegras_conferirAlcada_(op, payload) {
  var a = op && op.alcada; if (!a) return;
  if (a.recusa) OmieOps_erro_('Esta operação foi recusada por ' + (a.recusadoPorNome || 'outra pessoa da lista de sigilo') + ': ' + a.recusa + '. Nada foi enviado. Se ainda for preciso, prepare uma nova prévia.');
  if (a.aprovacao && !a.aprovadoPorId) OmieOps_erro_('Esta operação passa da alçada de aprovação e está aguardando a aprovação do dono do sistema ou da Diretoria. Nada foi enviado. Peça para aprovarem em Painel financeiro > Regras do Financeiro > Aprovações e depois toque em Confirmar de novo (a prévia espera até 24 horas).');
  if (a.segunda) {
    var d = OmieRegras_dinheiro_(payload && payload.valorConfirmado);
    if (!(Math.abs(d - a.valor) < 0.005)) OmieOps_erro_('Para operações acima da alçada, digite de novo o valor exato no campo "Digite o valor de novo". O valor digitado não confere com o da prévia. Nada foi enviado.');
  }
}
/** Prazo da prévia: com aprovação pendente, 24 horas para aprovar; sem, 10 minutos (como sempre). */
function OmieRegras_expira_(op, agora) { return agora + (op.alcada && op.alcada.aprovacao ? OMIE_APROVACAO_JANELA_MS : OMIE_PREVIA_MS); }
function OmieRegras_expiraTexto_(op) { return op.alcada && op.alcada.aprovacao ? '24 horas para a aprovação; depois de aprovada, 10 minutos para confirmar' : '10 minutos'; }
function OmieRegras_alcadaTela_(op) { return op.alcada ? { segunda: !!op.alcada.segunda, aprovacao: !!op.alcada.aprovacao } : null; }

/** Operações aguardando aprovação (de Lançamentos e baixas e de notas recebidas). */
function OmieRegras_pendentes_(eu) {
  var p = PropertiesService.getScriptProperties(), agora = Date.now(), uid = OmieRegras_s_(eu && (eu.userId || eu.id), 80), l = [];
  (p.getKeys ? p.getKeys() : []).forEach(function (k) {
    if (!/^(OMIE_OPS_|OMIE_NOTA_)/.test(k) || k.indexOf('OMIE_OPS_ENVIO_') === 0) return;
    var op = null; try { op = JSON.parse(p.getProperty(k)); } catch (e) { return; }
    var a = op && op.alcada;
    if (!a || !a.aprovacao || a.aprovadoPorId || a.recusa || op.estado !== 'pendente' || !(op.expira > agora)) return;
    l.push({ chave: k, origem: k.indexOf('OMIE_NOTA_') === 0 ? 'Nota recebida' : 'Lançamentos e baixas', valor: OmieRegras_moeda_(a.valor), preparadoPor: a.preparadoPorNome,
      minha: a.preparadoPorId === uid, podeDecidir: a.preparadoPorId !== uid && OmieRegras_podeAprovar_(eu), resumo: (op.resumo || []).map(function (x) { return [OmieRegras_s_(x[0], 80), OmieRegras_s_(x[1], 400)]; }) });
  });
  return l;
}
function OmieRegras_contarPendentesPara_(eu) { try { return OmieRegras_pendentes_(eu).filter(function (x) { return x.podeDecidir; }).length; } catch (e) { return 0; } }
function OmieRegras_apiAprovacoes(sessionId) {
  return OmieOps_resposta_(function () { var eu = Omie_exigirAcesso_(sessionId); return { itens: OmieRegras_pendentes_(eu) }; });
}
/** Aprovar ou recusar. payload: { chave, decisao: 'aprovar' | 'recusar', motivo }. Quem preparou não decide. */
function OmieRegras_apiDecidir(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_CONSULTAR', 'aprovar uma operação do Financeiro'), d = payload || {};
    var chave = OmieRegras_s_(d.chave, 120), decisao = String(d.decisao || ''), motivo = OmieRegras_s_(d.motivo, 300);
    if (!/^(OMIE_OPS_|OMIE_NOTA_)[A-Za-z0-9-]{10,80}$/.test(chave) || chave.indexOf('OMIE_OPS_ENVIO_') === 0) OmieOps_erro_('Operação não encontrada. Atualize a lista.');
    if (decisao !== 'aprovar' && decisao !== 'recusar') OmieOps_erro_('Escolha aprovar ou recusar.');
    if (decisao === 'recusar' && motivo.length < 10) OmieOps_erro_('Escreva por que está recusando (pelo menos 10 letras). Quem preparou recebe o motivo ao tentar confirmar.');
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var p = PropertiesService.getScriptProperties(), raw = p.getProperty(chave), op = raw ? JSON.parse(raw) : null, a = op && op.alcada, uid = OmieRegras_s_(eu.userId || eu.id, 80);
      if (!op || !a || !a.aprovacao || op.estado !== 'pendente' || a.aprovadoPorId || a.recusa || !(op.expira > Date.now())) OmieOps_erro_('Esta operação não está mais aguardando aprovação (já foi decidida, confirmada ou expirou). Atualize a lista.');
      if (a.preparadoPorId === uid) OmieOps_erro_('Quem preparou a operação não aprova a própria operação. Peça ao dono do sistema ou à Diretoria (a outra pessoa, não você). Nada foi alterado.');
      if (!OmieRegras_podeAprovar_(eu)) {
        if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, 'NEGADO', 'OmieRegras_apiDecidir', 'Tentou ' + decisao + ' operação acima da alçada: só o dono e a Diretoria decidem.');
        OmieOps_erro_(OMIE_MSG_SO_DIRETORIA_APROVA);
      }
      if (decisao === 'aprovar') { a.aprovadoPorId = uid; a.aprovadoPorNome = OmieRegras_s_(eu.nome || eu.usuario, 80); a.aprovadoEm = new Date().toISOString(); op.expira = Date.now() + OMIE_PREVIA_MS; }
      else { a.recusa = motivo; a.recusadoPorNome = OmieRegras_s_(eu.nome || eu.usuario, 80); }
      p.setProperty(chave, JSON.stringify(op));
      var det = (decisao === 'aprovar' ? 'Aprovou' : 'Recusou') + ' operação acima da alçada preparada por ' + a.preparadoPorNome + (decisao === 'recusar' ? ' · motivo: ' + motivo : '');
      if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, decisao === 'aprovar' ? 'APROVADA' : 'RECUSADA', 'OmieRegras_apiDecidir', det);
      try { SGO_DATA.log('OMIE_ALCADA', OmieRegras_s_(eu.usuario, 60), det, 'FINANCEIRO'); } catch (e) {}
      return { mensagem: decisao === 'aprovar' ? 'Aprovada. ' + a.preparadoPorNome + ' tem 10 minutos para confirmar no Omie.' : 'Recusada. Nada foi enviado; ' + a.preparadoPorNome + ' vê o motivo ao tentar confirmar.', itens: OmieRegras_pendentes_(eu) };
    } finally { lock.releaseLock(); }
  });
}

// ------------------------------------------------------------------------------------------------ de-para de categorias
/** Confere e normaliza o de-para. Erro público com o que está errado. */
function OmieRegras_validarDepara_(regras) {
  if (!Array.isArray(regras)) OmieOps_erro_('O de-para precisa ser uma lista de regras.');
  if (regras.length > 200) OmieOps_erro_('O de-para aceita no máximo 200 regras.');
  var vistos = {};
  return regras.map(function (r, i) {
    r = r || {};
    var tipo = OmieRegras_s_(r.tipo, 30).toUpperCase(), cnpj = String(r.cnpj || '').replace(/\D/g, ''), cat = OmieRegras_s_(r.categoria, 20);
    if (!OMIE_DEPARA_TIPOS[tipo]) OmieOps_erro_('Regra ' + (i + 1) + ': tipo de lançamento inválido. Use NF-e de compra, NFS-e ou conta a receber de proposta.');
    if (!/^[0-9A-Za-z.\-]{1,20}$/.test(cat)) OmieOps_erro_('Regra ' + (i + 1) + ': escolha a categoria do Omie.');
    if (cnpj && !(typeof OmieCad_docOk_ === 'function' ? OmieCad_docOk_(cnpj) : /^\d{11,14}$/.test(cnpj))) OmieOps_erro_('Regra ' + (i + 1) + ': o CNPJ/CPF ' + cnpj + ' não confere (dígitos verificadores).');
    var k = tipo + '|' + cnpj; if (vistos[k]) OmieOps_erro_('Regra ' + (i + 1) + ': já existe uma regra para ' + OMIE_DEPARA_TIPOS[tipo] + (cnpj ? ' e este CNPJ' : ' sem CNPJ') + '. Deixe uma só.'); vistos[k] = 1;
    return { tipo: tipo, cnpj: cnpj, categoria: cat, descricao: OmieRegras_s_(r.descricao, 120) };
  });
}
/** De-para gravado. Ilegível ou inválido = vazio (a pessoa escolhe em cada lançamento, como antes). */
function OmieRegras_depara_() {
  var t = OmieRegras_prop_(OMIE_REGRAS_DEPARA_PROP); if (!t) return [];
  try { var j = JSON.parse(t); return OmieRegras_validarDepara_(Array.isArray(j) ? j : (j && j.regras) || []); } catch (e) { return []; }
}
/** Sugestão: a regra do CNPJ vale antes da regra geral do tipo. { categoria, descricao, origem } ou null. */
function OmieRegras_sugerir_(tipo, cnpj) {
  var d = String(cnpj || '').replace(/\D/g, ''), l = OmieRegras_depara_().filter(function (r) { return r.tipo === tipo; });
  var r = (d && l.filter(function (x) { return x.cnpj === d; })[0]) || l.filter(function (x) { return !x.cnpj; })[0];
  return r ? { categoria: r.categoria, descricao: r.descricao, origem: r.cnpj ? 'regra do de-para para este CNPJ' : 'regra geral do de-para' } : null;
}
/** Categorias utilizáveis do Omie por natureza (até 5 páginas de 100). */
function OmieRegras_categoriasOmie_() {
  var todas = [];
  for (var pg = 1; pg <= 5; pg++) {
    var r = Omie_requisitar_('geral/categorias/', 'ListarCategorias', { pagina: pg, registros_por_pagina: 100, apenas_importado_api: 'N' });
    todas = todas.concat(r.categoria_cadastro || []);
    if (!(Number(r.total_de_paginas) > pg)) break;
  }
  return todas;
}
function OmieRegras_historico_() {
  var l = []; try { l = SGO_DATA.getAll(OMIE_REGRAS_HIST_ABA) || []; } catch (e) { l = []; }
  return l.slice(-30).reverse().map(function (h) { return { em: typeof OmieSig_dataBr_ === 'function' ? OmieSig_dataBr_(h.EM) : OmieRegras_s_(h.EM), nome: OmieRegras_s_(h.NOME || h.USUARIO, 80), regra: OmieRegras_s_(h.REGRA, 80), depois: OmieRegras_s_(h.DEPOIS, 600), motivo: OmieRegras_s_(h.MOTIVO, 300) }; });
}
/** Tela "Regras do Financeiro": configurações em vigor (só leitura), de-para, histórico e aprovações pendentes. */
function OmieRegras_apiTela(sessionId) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId), a = OmieRegras_alcadas_();
    var podeEditar = typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function' ? !!SGO_pode_(sessionId, 'FIN_OMIE_LANCAR') : true;
    return {
      config: { destinoNfe: OmieRegras_destinoNfe_(), retencoes: OmieRegras_retencoes_(), alcadaSegunda: a.segunda ? OmieRegras_moeda_(a.segunda) : '', alcadaAprovacao: a.aprovacao ? OmieRegras_moeda_(a.aprovacao) : '',
        // 16/11/2026 (Onda 2): saldo mínimo, nota de saúde e fotografia diária (Chaves e senhas > Regras do Financeiro)
        saldoMinimo: typeof FinInd_saldoMinimo_ === 'function' && FinInd_saldoMinimo_() !== null ? OmieRegras_moeda_(FinInd_saldoMinimo_()) : '',
        saudePesos: OmieRegras_prop_('FIN_SAUDE_PESOS'), saudeLimites: OmieRegras_prop_('FIN_SAUDE_LIMITES'),
        fotoHora: typeof FinFoto_horaInicio_ === 'function' ? FinFoto_horaInicio_() : '06:00', fotoLigada: OmieRegras_prop_('FIN_FOTO_ROTINA').toUpperCase() !== 'DESLIGADA',
        soDiretoria: typeof SGO_aprovacaoSoDiretoria_ === 'function' ? SGO_aprovacaoSoDiretoria_() : true },
      tipos: Object.keys(OMIE_DEPARA_TIPOS).map(function (k) { return { codigo: k, nome: OMIE_DEPARA_TIPOS[k], natureza: OMIE_DEPARA_NATUREZA[k] }; }),
      depara: OmieRegras_depara_(), podeEditar: podeEditar, podeAprovar: OmieRegras_podeAprovar_(eu), historico: OmieRegras_historico_(), aprovacoes: OmieRegras_pendentes_(eu)
    };
  });
}
/** Grava o de-para. payload: { regras: [{ tipo, cnpj, categoria }], motivo }. Cada categoria é conferida no Omie. */
function OmieRegras_apiSalvarDepara(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'alterar as regras do Financeiro'), p = payload || {}, motivo = OmieRegras_s_(p.motivo, 300);
    if (motivo.length < 10) OmieOps_erro_('Escreva o motivo da mudança (pelo menos 10 letras), por exemplo "de-para combinado com o contador". Nada foi gravado.');
    var regras = OmieRegras_validarDepara_(p.regras || []);
    if (regras.length) {
      var cats = {}; OmieRegras_categoriasOmie_().forEach(function (c) { cats[String(c.codigo)] = c; });
      regras.forEach(function (r, i) {
        var c = cats[r.categoria];
        if (!c) OmieOps_erro_('Regra ' + (i + 1) + ': a categoria ' + r.categoria + ' não existe no Omie. Atualize a lista e escolha de novo. Nada foi gravado.');
        if (!OmieOps_categoriaUsavel_(c, OMIE_DEPARA_NATUREZA[r.tipo])) OmieOps_erro_('Regra ' + (i + 1) + ': a categoria "' + OmieRegras_s_(c.descricao, 60) + '" não serve para ' + OMIE_DEPARA_TIPOS[r.tipo] + ' (precisa ser ativa e de ' + (OMIE_DEPARA_NATUREZA[r.tipo] === 'pagar' ? 'despesa' : 'receita') + '). Nada foi gravado.');
        r.descricao = OmieRegras_s_(c.descricao, 120);
      });
    }
    var antes = OmieRegras_prop_(OMIE_REGRAS_DEPARA_PROP), depois = regras.length ? JSON.stringify({ versao: 1, regras: regras }) : '';
    var props = PropertiesService.getScriptProperties();
    if (depois) props.setProperty(OMIE_REGRAS_DEPARA_PROP, depois); else props.deleteProperty(OMIE_REGRAS_DEPARA_PROP);
    var texto = function (l) { return l.map(function (r) { return OMIE_DEPARA_TIPOS[r.tipo] + (r.cnpj ? ' (CNPJ ' + r.cnpj + ')' : '') + ' → ' + r.categoria + ' ' + r.descricao; }).join('; ') || 'vazio (a pessoa escolhe em cada lançamento)'; };
    var antesL = []; try { antesL = antes ? OmieRegras_validarDepara_((JSON.parse(antes) || {}).regras || []) : []; } catch (e) { antesL = []; }
    try { if (typeof CertCal_garantirTabela_ === 'function') CertCal_garantirTabela_(OMIE_REGRAS_HIST_ABA, OMIE_REGRAS_HIST_COLUNAS); } catch (e) {}
    try { SGO_DATA.insert(OMIE_REGRAS_HIST_ABA, { ID: Utilities.getUuid(), EM: new Date().toISOString(), USUARIO_ID: OmieRegras_s_(eu.userId, 80), USUARIO: OmieRegras_s_(eu.usuario, 60), NOME: OmieRegras_s_(eu.nome, 80), REGRA: 'De-para de categorias', ANTES: texto(antesL).slice(0, 2000), DEPOIS: texto(regras).slice(0, 2000), MOTIVO: motivo }); } catch (e) {}
    if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, 'REGRA_ALTERADA', 'OmieRegras_apiSalvarDepara', 'De-para de categorias: ' + regras.length + ' regra(s). Motivo: ' + motivo);
    return { mensagem: regras.length ? 'De-para gravado: ' + regras.length + ' regra(s). A categoria sugerida aparece já escolhida no lançamento; confira sempre na prévia.' : 'De-para esvaziado: a categoria volta a ser escolhida em cada lançamento.', tela: OmieRegras_apiTela(sessionId) };
  });
}
