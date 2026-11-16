/****************************************************
 * CONCILIAÇÃO CAJU — COLABORADORES (11/11/2026)
 *
 * Vínculo da pessoa do SGO+ (CAD_USUARIOS, equipe interna) com o colaborador do Caju (employeeId), pelo CPF. O cadastro do SGO+
 * não tem CPF: o Financeiro informa o CPF uma vez (ou confirma a sugestão por nome vinda da lista do Caju) e o vínculo guarda o
 * CPF (CJU_COLABORADORES, só o Financeiro usa; na tela aparece mascarado). A lista do Caju (CJU_PESSOAS_CAJU) é lida pelo botão
 * "Atualizar a lista do Caju"; quem não está no Caju é cadastrado lá com confirmação; arquivar e desarquivar valem no Caju e
 * aparecem aqui. Pessoa inativa no SGO+ e ativa no Caju vira sugestão de arquivar (nada é arquivado sozinho).
 * Caixa: CAJU_COLABORADORES (padrão Financeiro). Só funções (carrega antes de SGO_Viagem.js).
 ****************************************************/

var CJU_TEL_RX = /^[0-9]{2}9[0-9]{8}$/;

function Cju_vinculos_() {
  var m = {};
  Cju_ler_(CJU_ABAS.COLABORADORES).forEach(function (v) { if (Via_up_(v.SITUACAO) === 'ATIVO' && Via_s_(v.USUARIO_ID)) m[Via_s_(v.USUARIO_ID)] = v; });
  return m;
}
function Cju_vinculoDe_(usuarioId) { return Cju_vinculos_()[Via_s_(usuarioId)] || null; }
function Cju_pessoasCaju_() { return Cju_ler_(CJU_ABAS.PESSOAS_CAJU).filter(function (p) { return !Via_s_(p.SUMIU_EM); }); }
/** Todos os usuários do cadastro (inclui inativos), equipe interna. */
function Cju_usuariosTodos_() {
  var m = {};
  try {
    Via_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
      var id = Via_s_(u.ID), perfil = Via_up_(u.PERFIL);
      if (!id || VIA_FORA.indexOf(perfil) >= 0) return;
      m[id] = { id: id, nome: Via_s_(u.NOME) || Via_s_(u.USUARIO), login: Via_s_(u.USUARIO).toLowerCase(), perfil: perfil, area: Via_up_(u.AREA), email: Via_s_(u.EMAIL).toLowerCase(),
        celular: Via_s_(u.CELULAR).replace(/\D/g, '').replace(/^55(?=\d{11}$)/, ''), ativo: Via_up_(u.STATUS || 'ATIVO') === 'ATIVO' && !Via_s_(u.EXCLUIDO_EM) };
    });
  } catch (e) {}
  return m;
}
/** Mesma pessoa pelo nome? Igual sem acento, ou todos os nomes do menor (2 ou mais) dentro do maior. */
function Cju_nomeBate_(a, b) {
  a = Cju_norm_(a); b = Cju_norm_(b);
  if (!a || !b) return false;
  if (a === b) return true;
  var ta = a.split(' '), tb = b.split(' '), menor = ta.length <= tb.length ? ta : tb, maior = ta.length <= tb.length ? tb : ta;
  return menor.length >= 2 && menor[0] === maior[0] && menor.every(function (t) { return maior.indexOf(t) >= 0; });
}
function Cju_pessoaTela_(p) { return { employeeId: Via_s_(p.EMPLOYEE_ID), employeeFinal: Via_s_(p.EMPLOYEE_ID).slice(-6), nome: Via_s_(p.NOME), cpf: Cju_cpfMascara_(p.CPF), arquivado: Via_up_(p.ARQUIVADO) === 'SIM' }; }

function Cju_colaboradoresTela_(eu) {
  var us = Cju_usuariosTodos_(), vinc = Cju_vinculos_(), pessoas = Cju_pessoasCaju_(), lido = '';
  pessoas.forEach(function (p) { if (Via_s_(p.LIDO_EM) > lido) lido = Via_s_(p.LIDO_EM); });
  var ligados = {};
  Object.keys(vinc).forEach(function (k) { ligados[Via_s_(vinc[k].EMPLOYEE_ID)] = k; });
  var andamento = typeof Cju_pedidosEmAndamento_ === 'function' ? Cju_pedidosEmAndamento_() : [];
  var linhas = Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) { return u.ativo || vinc[u.id]; }).map(function (u) {
    var v = vinc[u.id], p = v ? pessoas.filter(function (x) { return Via_s_(x.EMPLOYEE_ID) === Via_s_(v.EMPLOYEE_ID); })[0] : null;
    var sug = !v ? pessoas.filter(function (x) { return !ligados[Via_s_(x.EMPLOYEE_ID)] && Cju_nomeBate_(x.NOME, u.nome); }).map(Cju_pessoaTela_) : [];
    var arquivado = v ? (p ? Via_up_(p.ARQUIVADO) === 'SIM' : Via_up_(v.CAJU_ARQUIVADO) === 'SIM') : false;
    var alerta = '';
    if (v && !u.ativo && !arquivado) alerta = 'Inativo no SGO+ e ativo no Caju: se a pessoa saiu da empresa, arquive no Caju.';
    else if (v && u.ativo && arquivado) alerta = 'Arquivado no Caju: não recebe carga. Se a pessoa continua viajando, desarquive.';
    else if (v && pessoas.length && !p) alerta = 'Não aparece mais na lista do Caju (última leitura). Confira no portal do Caju.';
    return { usuarioId: u.id, nome: u.nome, perfil: u.perfil, area: u.area, ativo: u.ativo, email: u.email, celularOk: CJU_TEL_RX.test(u.celular), celular: u.celular ? '(' + u.celular.slice(0, 2) + ') •••••-' + u.celular.slice(-4) : '',
      vinculado: !!v, cpf: v ? Cju_cpfMascara_(v.CPF) : '', employeeFinal: v ? Via_s_(v.EMPLOYEE_ID).slice(-6) : '', cajuNome: v ? Via_s_(v.CAJU_NOME) : '', arquivado: arquivado,
      origem: v ? (Via_up_(v.ORIGEM) === 'CADASTRADO' ? 'Cadastrado no Caju pelo SGO+' : 'Vinculado ao cadastro que já existia no Caju') : '', em: v ? Via_br_(v.VINCULADO_EM) : '', por: v ? Via_s_(v.VINCULADO_POR_NOME) : '',
      sugestoes: sug, alerta: alerta, pedidoEmAndamento: andamento.some(function (x) { return Via_s_(x.PESSOA_ID) === u.id; }) };
  }).sort(function (a, b) { return (a.vinculado - b.vinculado) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var semVinculo = pessoas.filter(function (p) { return !ligados[Via_s_(p.EMPLOYEE_ID)]; }).map(function (p) {
    var t = Cju_pessoaTela_(p), sug = Object.keys(us).map(function (k) { return us[k]; }).filter(function (u) { return u.ativo && !vinc[u.id] && Cju_nomeBate_(u.nome, p.NOME); })[0];
    t.sugestao = sug ? { usuarioId: sug.id, nome: sug.nome } : null; return t;
  }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  return { pessoas: linhas, semVinculo: semVinculo, lidoEm: Via_br_(lido), lidos: pessoas.length, integracao: CajuApi_situacao_(), podeAlterar: Cju_pode_(eu, 'CAJU_COLABORADORES'),
    resumo: { total: linhas.filter(function (x) { return x.ativo; }).length, vinculados: linhas.filter(function (x) { return x.ativo && x.vinculado; }).length, alertas: linhas.filter(function (x) { return x.alerta; }).length } };
}
/** Lê a lista do Caju e guarda (CJU_PESSOAS_CAJU). Quem sumiu da lista fica marcado; vínculos recebem o nome e o arquivado. */
function Cju_lerColaboradoresCaju_(eu) {
  Cju_exigir_(eu, 'CAJU_COLABORADORES', 'ler a lista de colaboradores do Caju');
  var lista = CajuApi_listarColaboradores_({ origem: 'colaboradores', porId: eu.id, porNome: eu.nome });
  var agora = Via_agora_();
  Via_comTrava_(function () {
    Cju_garantirAbas_();
    var atuais = {};
    Via_ler_(CJU_ABAS.PESSOAS_CAJU).forEach(function (p) { atuais[Via_s_(p.EMPLOYEE_ID)] = p; });
    var vistos = {};
    lista.forEach(function (x) {
      vistos[x.employeeId] = true;
      var d = { EMPLOYEE_ID: x.employeeId, CPF: x.cpf, NOME: x.nome, EMAIL: x.email, ARQUIVADO: x.arquivado ? 'SIM' : '', LIDO_EM: agora, SUMIU_EM: '' };
      if (atuais[x.employeeId]) SGO_DATA.update(CJU_ABAS.PESSOAS_CAJU, atuais[x.employeeId].ID, d);
      else SGO_DATA.insert(CJU_ABAS.PESSOAS_CAJU, Object.assign({ ID: x.employeeId }, d));
    });
    Object.keys(atuais).forEach(function (k) { if (!vistos[k] && !Via_s_(atuais[k].SUMIU_EM)) SGO_DATA.update(CJU_ABAS.PESSOAS_CAJU, atuais[k].ID, { SUMIU_EM: agora }); });
    Via_ler_(CJU_ABAS.COLABORADORES).forEach(function (v) {
      var x = lista.filter(function (p) { return p.employeeId === Via_s_(v.EMPLOYEE_ID); })[0];
      if (x && Via_up_(v.SITUACAO) === 'ATIVO') SGO_DATA.update(CJU_ABAS.COLABORADORES, v.ID, { CAJU_NOME: x.nome, CAJU_ARQUIVADO: x.arquivado ? 'SIM' : '', ATUALIZADO_EM: agora });
    });
    Cju_memoLimpar_();
    Cju_historico_('COLABORADORES', 'LISTA', 'LISTA_LIDA', eu, 'Lista do Caju lida: ' + lista.length + ' colaboradores.');
  });
  var t = Cju_colaboradoresTela_(eu);
  t.message = 'Lista do Caju lida: ' + lista.length + (lista.length === 1 ? ' colaborador' : ' colaboradores') + '. ' + (t.semVinculo.length ? t.semVinculo.length + ' sem vínculo no SGO+ (veja abaixo).' : 'Todos os do Caju têm vínculo.');
  return t;
}
function Cju_usuarioInterno_(id, exigeAtivo) {
  var u = Cju_usuariosTodos_()[Via_s_(id)];
  if (!u) throw new Error('Pessoa não encontrada no cadastro do SGO+ (equipe interna). Atualize a tela e escolha de novo.');
  if (exigeAtivo && !u.ativo) throw new Error(u.nome + ' está inativo no SGO+. Só pessoas ativas recebem vínculo novo no Caju.');
  return u;
}
/** Vincula. d: { usuarioId, cpf } ou { usuarioId, employeeId } (sugestão da lista). CPF fora da lista devolve naoEncontrado. */
function Cju_vincular_(eu, d) {
  Cju_exigir_(eu, 'CAJU_COLABORADORES', 'vincular a pessoa ao Caju');
  d = d || {};
  var u = Cju_usuarioInterno_(d.usuarioId, true), cpf = Cju_cpf_(d.cpf), emp = Via_s_(d.employeeId);
  if (!emp && !Cju_cpfValido_(cpf)) throw new Error('Não foi possível vincular: o CPF de ' + u.nome + ' não é válido (11 números, com os dígitos de conferência). Confira no documento da pessoa.');
  var saida = Via_comTrava_(function () {
    Cju_garantirAbas_(); Cju_memoLimpar_();
    var pessoas = Cju_pessoasCaju_();
    if (!pessoas.length) throw new Error('Não foi possível vincular: a lista do Caju ainda não foi lida. Toque em "Atualizar a lista do Caju" e tente de novo.');
    var p = emp ? pessoas.filter(function (x) { return Via_s_(x.EMPLOYEE_ID) === emp; })[0] : pessoas.filter(function (x) { return Cju_cpf_(x.CPF) === cpf; })[0];
    if (!p) {
      if (emp) throw new Error('Não foi possível vincular: este colaborador não está mais na lista do Caju. Atualize a lista e tente de novo.');
      return { naoEncontrado: true, u: u };
    }
    var vinc = Cju_vinculos_();
    if (vinc[u.id]) throw new Error('Não foi possível vincular: ' + u.nome + ' já tem vínculo com o Caju (' + Cju_cpfMascara_(vinc[u.id].CPF) + '). Para trocar, desfaça o vínculo antes, com o motivo.');
    var outro = Object.keys(vinc).filter(function (k) { return Via_s_(vinc[k].EMPLOYEE_ID) === Via_s_(p.EMPLOYEE_ID) || (Cju_cpf_(p.CPF) && Cju_cpf_(vinc[k].CPF) === Cju_cpf_(p.CPF)); })[0];
    if (outro) throw new Error('Não foi possível vincular: este cadastro do Caju (' + Cju_cpfMascara_(p.CPF) + ', ' + Via_s_(p.NOME) + ') já está ligado a ' + Via_s_(vinc[outro].USUARIO_NOME) + '. Confira o CPF.');
    var agora = Via_agora_();
    Cju_inserir_(CJU_ABAS.COLABORADORES, { ID: Via_id_(), USUARIO_ID: u.id, USUARIO_NOME: u.nome, CPF: Cju_cpf_(p.CPF), EMPLOYEE_ID: Via_s_(p.EMPLOYEE_ID), CAJU_NOME: Via_s_(p.NOME),
      CAJU_ARQUIVADO: Via_up_(p.ARQUIVADO) === 'SIM' ? 'SIM' : '', ORIGEM: 'VINCULADO', SITUACAO: 'ATIVO', VINCULADO_EM: agora, VINCULADO_POR_ID: eu.id, VINCULADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    Cju_historico_('COLABORADOR', u.id, 'VINCULADO', eu, u.nome + ' vinculado ao colaborador do Caju ' + Via_s_(p.NOME) + ' (' + Cju_cpfMascara_(p.CPF) + ', id …' + Via_s_(p.EMPLOYEE_ID).slice(-6) + ').');
    return { u: u, p: p };
  });
  var t = Cju_colaboradoresTela_(eu);
  if (saida.naoEncontrado) { t.naoEncontrado = true; t.usuarioId = u.id; t.message = 'O CPF ' + Cju_cpfMascara_(cpf) + ' não está na lista do Caju. Se ' + u.nome + ' ainda não tem cadastro no Caju, use "Cadastrar no Caju" (abaixo do nome), confira os dados e confirme.'; return t; }
  t.message = u.nome + ' vinculado ao Caju (' + Via_s_(saida.p.NOME) + ').' + (Via_up_(saida.p.ARQUIVADO) === 'SIM' ? ' Atenção: está arquivado no Caju; desarquive antes da carga.' : '');
  return t;
}
function Cju_desvincular_(eu, d) {
  Cju_exigir_(eu, 'CAJU_COLABORADORES', 'desfazer o vínculo com o Caju');
  d = d || {};
  var motivo = Via_texto_(d.motivo, 400);
  if (motivo.length < 10) throw new Error('Não foi possível desfazer o vínculo: escreva o motivo (10 letras ou mais), por exemplo "CPF informado errado".');
  Via_comTrava_(function () {
    Cju_memoLimpar_();
    var v = Cju_vinculoDe_(d.usuarioId);
    if (!v) throw new Error('Não foi possível desfazer: esta pessoa não tem vínculo com o Caju.');
    if (Cju_pedidosEmAndamento_().some(function (p) { return Via_s_(p.PESSOA_ID) === Via_s_(d.usuarioId); })) throw new Error('Não foi possível desfazer o vínculo: há pedido de crédito no Caju em andamento para ' + Via_s_(v.USUARIO_NOME) + '. Espere o crédito ou cancele o pedido antes.');
    Cju_atualizar_(CJU_ABAS.COLABORADORES, v.ID, { SITUACAO: 'DESFEITO', DESFEITO_EM: Via_agora_(), DESFEITO_POR_NOME: eu.nome, DESFEITO_MOTIVO: motivo, ATUALIZADO_EM: Via_agora_() });
    Cju_historico_('COLABORADOR', v.USUARIO_ID, 'DESVINCULADO', eu, 'Vínculo com o Caju desfeito (' + Cju_cpfMascara_(v.CPF) + '). Motivo: ' + motivo);
  });
  var t = Cju_colaboradoresTela_(eu); t.message = 'Vínculo desfeito. O cadastro no Caju continua como está (nada foi apagado lá).'; return t;
}
/** Cadastra no Caju (com confirmação na tela). d: { usuarioId, cpf, nome, nomeSocial, email, celular, nascimento }. */
function Cju_cadastrarColaborador_(eu, d) {
  Cju_exigir_(eu, 'CAJU_COLABORADORES', 'cadastrar o colaborador no Caju');
  d = d || {};
  var u = Cju_usuarioInterno_(d.usuarioId, true), cpf = Cju_cpf_(d.cpf), nome = Via_texto_(d.nome, 120).replace(/\s+/g, ' '), email = Via_s_(d.email).toLowerCase(),
    cel = Via_s_(d.celular).replace(/\D/g, '').replace(/^55(?=\d{11}$)/, ''), nasc = Via_dia_(d.nascimento), social = Via_texto_(d.nomeSocial, 120);
  if (!Cju_cpfValido_(cpf)) throw new Error('Não foi possível cadastrar no Caju: o CPF não é válido (11 números, com os dígitos de conferência). Confira no documento da pessoa.');
  if (nome.split(' ').filter(Boolean).length < 2) throw new Error('Não foi possível cadastrar no Caju: escreva o nome completo, como no documento (nome e sobrenome).');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Não foi possível cadastrar no Caju: o e-mail não parece certo. Confira ou deixe em branco (com o celular preenchido).');
  if (cel && !CJU_TEL_RX.test(cel)) throw new Error('Não foi possível cadastrar no Caju: o celular precisa ter DDD + 9 + 8 números (ex.: 62 9 8888-7777). Confira ou deixe em branco (com o e-mail preenchido).');
  if (!email && !cel) throw new Error('Não foi possível cadastrar no Caju: o Caju exige pelo menos um contato. Preencha o e-mail ou o celular.');
  if (d.nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nasc)) throw new Error('Não foi possível cadastrar no Caju: a data de nascimento não é válida. Use o calendário ou deixe em branco.');
  if (nasc && nasc >= Via_hoje_()) throw new Error('Não foi possível cadastrar no Caju: a data de nascimento não pode ser hoje nem futura.');
  if (d.confirmar !== true) throw new Error('Não foi possível cadastrar no Caju: confirme os dados na tela antes (o cadastro vai para o Caju de verdade).');
  Cju_memoLimpar_();
  if (Cju_vinculoDe_(u.id)) throw new Error('Não foi possível cadastrar: ' + u.nome + ' já tem vínculo com o Caju.');
  var ja = Cju_pessoasCaju_().filter(function (x) { return Cju_cpf_(x.CPF) === cpf; })[0];
  if (ja) throw new Error('Não foi possível cadastrar: este CPF já está no Caju (' + Via_s_(ja.NOME) + '). Use "Vincular pelo CPF" em vez de cadastrar de novo.');
  var empId = CajuApi_criarColaborador_({ cpf: cpf, nome: nome, nomeSocial: social, email: email, celular: cel, nascimento: nasc }, { origem: 'colaboradores', ref: u.id, porId: eu.id, porNome: eu.nome });
  Via_comTrava_(function () {
    Cju_garantirAbas_(); var agora = Via_agora_();
    var existe = Via_ler_(CJU_ABAS.PESSOAS_CAJU).filter(function (x) { return Via_s_(x.EMPLOYEE_ID) === empId; })[0];
    var dp = { EMPLOYEE_ID: empId, CPF: cpf, NOME: nome, EMAIL: email, ARQUIVADO: '', LIDO_EM: agora, SUMIU_EM: '' };
    if (existe) SGO_DATA.update(CJU_ABAS.PESSOAS_CAJU, existe.ID, dp); else SGO_DATA.insert(CJU_ABAS.PESSOAS_CAJU, Object.assign({ ID: empId }, dp));
    Cju_inserir_(CJU_ABAS.COLABORADORES, { ID: Via_id_(), USUARIO_ID: u.id, USUARIO_NOME: u.nome, CPF: cpf, EMPLOYEE_ID: empId, CAJU_NOME: nome, CAJU_ARQUIVADO: '', ORIGEM: 'CADASTRADO', SITUACAO: 'ATIVO',
      VINCULADO_EM: agora, VINCULADO_POR_ID: eu.id, VINCULADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    Cju_historico_('COLABORADOR', u.id, 'CADASTRADO_NO_CAJU', eu, u.nome + ' cadastrado no Caju (' + Cju_cpfMascara_(cpf) + ', id …' + empId.slice(-6) + ') e vinculado.');
  });
  var t = Cju_colaboradoresTela_(eu); t.message = nome + ' cadastrado no Caju e vinculado. O primeiro cartão é pedido pelo portal do Caju (entrega em casa).'; return t;
}
function Cju_arquivarColaborador_(eu, d) {
  Cju_exigir_(eu, 'CAJU_COLABORADORES', 'arquivar ou desarquivar o colaborador no Caju');
  d = d || {};
  var arquivar = d.arquivar !== false, motivo = Via_texto_(d.motivo, 400);
  if (motivo.length < 10) throw new Error('Não foi possível ' + (arquivar ? 'arquivar' : 'desarquivar') + ': escreva o motivo (10 letras ou mais).');
  Cju_memoLimpar_();
  var v = Cju_vinculoDe_(d.usuarioId);
  if (!v) throw new Error('Não foi possível ' + (arquivar ? 'arquivar' : 'desarquivar') + ': a pessoa não tem vínculo com o Caju. Vincule antes.');
  if (arquivar && Cju_pedidosEmAndamento_().some(function (p) { return Via_s_(p.PESSOA_ID) === Via_s_(d.usuarioId); })) throw new Error('Não foi possível arquivar: há pedido de crédito no Caju em andamento para ' + Via_s_(v.USUARIO_NOME) + '. Espere o crédito ou cancele o pedido antes.');
  CajuApi_arquivarColaborador_(Via_s_(v.EMPLOYEE_ID), arquivar, { origem: 'colaboradores', ref: Via_s_(v.USUARIO_ID), porId: eu.id, porNome: eu.nome });
  Via_comTrava_(function () {
    var agora = Via_agora_();
    Cju_atualizar_(CJU_ABAS.COLABORADORES, v.ID, { CAJU_ARQUIVADO: arquivar ? 'SIM' : '', ATUALIZADO_EM: agora });
    var p = Via_ler_(CJU_ABAS.PESSOAS_CAJU).filter(function (x) { return Via_s_(x.EMPLOYEE_ID) === Via_s_(v.EMPLOYEE_ID); })[0];
    if (p) SGO_DATA.update(CJU_ABAS.PESSOAS_CAJU, p.ID, { ARQUIVADO: arquivar ? 'SIM' : '', LIDO_EM: agora });
    Cju_historico_('COLABORADOR', v.USUARIO_ID, arquivar ? 'ARQUIVADO_NO_CAJU' : 'DESARQUIVADO_NO_CAJU', eu, Via_s_(v.USUARIO_NOME) + (arquivar ? ' arquivado' : ' desarquivado') + ' no Caju. Motivo: ' + motivo);
  });
  var t = Cju_colaboradoresTela_(eu); t.message = Via_s_(v.USUARIO_NOME) + (arquivar ? ' arquivado no Caju: não recebe carga enquanto estiver arquivado.' : ' desarquivado no Caju: volta a receber carga.'); return t;
}
