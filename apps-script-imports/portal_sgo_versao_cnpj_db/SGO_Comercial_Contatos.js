/****************************************************
 * CONTATOS POR CLIENTE E UNIDADE — CAD_CONTATOS (21/10/2026)
 *
 * Decisão do dono: o SGO+ passa a ter várias pessoas por cliente e por unidade (quem compra, quem aprova,
 * quem usa, validação técnica, financeiro), ligadas ao cadastro único. Serve ao Comercial (contato da
 * oportunidade e da proposta), ao "Enviar documento" (destinatários sugeridos) e ao e-mail integrado
 * (e-mail de contato do cliente aparece na oportunidade).
 *
 * Migração (só acrescenta; nada é apagado nem trocado): o contato antigo do cliente (CAD_CLIENTES.CONTATO,
 * EMAIL, TELEFONE) vira o primeiro contato do cliente (ORIGEM = MIGRADO_CLIENTE) e o responsável da unidade
 * (CAD_UNIDADES.RESPONSAVEL, EMAIL, TELEFONE) vira o primeiro contato da unidade (ORIGEM = MIGRADO_UNIDADE).
 * Os campos antigos continuam onde estão. Roda uma vez para todos e, depois, para cada cliente ao abrir a lista
 * (cliente novo ou que só ganhou contato depois). Contato inativado fica no histórico (STATUS = INATIVO).
 *
 * Quem vê e mantém: a equipe comercial e a gestão (Administrador, Gestor, Diretoria). Contato é dado pessoal:
 * os demais perfis não abrem a lista (o "Enviar documento" usa os contatos para sugerir destinatários e
 * registra cada envio).
 ****************************************************/

var COM_CONTATOS_MIGRACAO_FLAG = 'COM_CONTATOS_MIGRACAO_V1';

function ComCt_podeVer_(eu) { return !!(eu && (eu.gestao || eu.vendedor || eu.perfil === 'ADMIN' || eu.perfil === 'GESTOR' || eu.perfil === 'DIRETORIA')); }
function ComCt_exigir_(eu, acao) {
  if (!ComCt_podeVer_(eu)) throw new Error('Não foi possível ' + acao + ': os contatos dos clientes são dados pessoais e ficam com a equipe comercial e a gestão. Se você precisa de um contato, peça ao comercial ou ao seu gestor');
}

function ComCt_emailOk_(e) { return /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(Com_s_(e)); }
function ComCt_digitos_(v) { return Com_s_(v).replace(/\D/g, ''); }

/** Contato para a tela. */
function ComCt_paraTela_(c, unidades) {
  var un = unidades && c.UNIDADE_ID ? unidades[Com_s_(c.UNIDADE_ID)] : null;
  return { id: Com_s_(c.ID), clienteId: Com_s_(c.CLIENTE_ID), unidadeId: Com_s_(c.UNIDADE_ID), unidadeNome: un ? Com_s_(un.NOME_UNIDADE) : '', nome: Com_s_(c.NOME),
    cargo: Com_s_(c.CARGO), papel: Com_up_(c.PAPEL), papelNome: COM_PAPEIS_CONTATO[Com_up_(c.PAPEL)] || '', email: Com_s_(c.EMAIL), celular: Com_s_(c.CELULAR), telefone: Com_s_(c.TELEFONE),
    principal: Com_up_(c.PRINCIPAL) === 'SIM', origem: Com_up_(c.ORIGEM), obs: Com_s_(c.OBS), ativo: Com_up_(c.STATUS || 'ATIVO') === 'ATIVO' };
}

/**
 * Migração do contato antigo. clienteId vazio = todos os clientes. Só insere o que falta. Devolve { inseridos }.
 * Chamar dentro da trava.
 */
function ComCt_migrar_(clienteId) {
  var contatos = Com_ler_(COM_ABAS.CONTATOS);
  var jaCliente = {}, jaUnidade = {};
  contatos.forEach(function (c) {
    var o = Com_up_(c.ORIGEM);
    if (o === 'MIGRADO_CLIENTE') jaCliente[Com_s_(c.CLIENTE_ID)] = true;
    if (o === 'MIGRADO_UNIDADE') jaUnidade[Com_s_(c.UNIDADE_ID)] = true;
  });
  var novos = [];
  var alvo = Com_s_(clienteId);
  Com_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) {
    var id = Com_s_(c.ID);
    if (!id || (alvo && id !== alvo) || jaCliente[id]) return;
    var nome = Com_s_(c.CONTATO), email = Com_s_(c.EMAIL).split(/[\s,;]+/)[0] || '', fone = Com_s_(c.TELEFONE);
    if (!nome && !email && !fone) return;
    novos.push({ CLIENTE_ID: id, UNIDADE_ID: '', NOME: nome || 'Contato do cadastro do cliente', CARGO: '', PAPEL: '', EMAIL: ComCt_emailOk_(email) ? email.toLowerCase() : '',
      CELULAR: ComCt_digitos_(fone).length === 11 ? ComCt_digitos_(fone) : '', TELEFONE: fone, PRINCIPAL: 'SIM', ORIGEM: 'MIGRADO_CLIENTE',
      OBS: 'Trazido do cadastro do cliente (campo de contato antigo, que continua no cadastro).', STATUS: 'ATIVO', CRIADO_POR_ID: 'COMERCIAL', CRIADO_POR_NOME: 'Migração do cadastro', ATUALIZADO_EM: Com_agora_() });
  });
  Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function (u) {
    var id = Com_s_(u.ID), cli = Com_s_(u.CLIENTE_ID);
    if (!id || !cli || (alvo && cli !== alvo) || jaUnidade[id]) return;
    var nome = Com_s_(u.RESPONSAVEL), email = Com_s_(u.EMAIL).split(/[\s,;]+/)[0] || '', fone = Com_s_(u.TELEFONE || u.CELULAR);
    if (!nome && !email && !fone) return;
    novos.push({ CLIENTE_ID: cli, UNIDADE_ID: id, NOME: nome || 'Responsável da unidade', CARGO: '', PAPEL: '', EMAIL: ComCt_emailOk_(email) ? email.toLowerCase() : '',
      CELULAR: ComCt_digitos_(fone).length === 11 ? ComCt_digitos_(fone) : '', TELEFONE: fone, PRINCIPAL: '', ORIGEM: 'MIGRADO_UNIDADE',
      OBS: 'Trazido do cadastro da unidade (responsável, que continua no cadastro).', STATUS: 'ATIVO', CRIADO_POR_ID: 'COMERCIAL', CRIADO_POR_NOME: 'Migração do cadastro', ATUALIZADO_EM: Com_agora_() });
  });
  if (novos.length) SGO_DATA.insertMany(COM_ABAS.CONTATOS, novos);
  return { inseridos: novos.length };
}

/** Migração geral uma vez (marca na propriedade). Nunca lança. */
function ComCt_migrarUmaVez_() {
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty(COM_CONTATOS_MIGRACAO_FLAG)) return null;
    var r = Com_comTrava_(function () { return ComCt_migrar_(''); });
    props.setProperty(COM_CONTATOS_MIGRACAO_FLAG, JSON.stringify({ em: Com_agora_(), inseridos: r.inseridos }));
    return r;
  } catch (e) { console.error('Comercial, migração de contatos: ' + ((e && e.message) || e)); return null; }
}

/** Contatos ativos de um cliente (e das unidades dele). unidadeId filtra: contatos da unidade + os do cliente sem unidade. */
function ComCt_listar_(clienteId, unidadeId, incluirInativos) {
  var cid = Com_s_(clienteId), uid = Com_s_(unidadeId);
  if (!cid) return [];
  var unidades = {};
  Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function (u) { if (Com_s_(u.CLIENTE_ID) === cid) unidades[Com_s_(u.ID)] = u; });
  return Com_ler_(COM_ABAS.CONTATOS).filter(function (c) {
    if (Com_s_(c.CLIENTE_ID) !== cid) return false;
    if (!incluirInativos && Com_up_(c.STATUS || 'ATIVO') !== 'ATIVO') return false;
    if (uid && Com_s_(c.UNIDADE_ID) && Com_s_(c.UNIDADE_ID) !== uid) return false;
    return true;
  }).map(function (c) { return ComCt_paraTela_(c, unidades); })
    .sort(function (a, b) { return (b.principal - a.principal) || (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/** E-mails conhecidos de um cliente: contatos ativos + e-mail do cadastro do cliente e das unidades. */
function ComCt_emailsDoCliente_(clienteId) {
  var cid = Com_s_(clienteId), l = [];
  if (!cid) return l;
  var add = function (e) { e = Com_s_(e).toLowerCase(); if (ComCt_emailOk_(e) && l.indexOf(e) < 0) l.push(e); };
  Com_ler_(COM_ABAS.CONTATOS).forEach(function (c) { if (Com_s_(c.CLIENTE_ID) === cid && Com_up_(c.STATUS || 'ATIVO') === 'ATIVO') add(c.EMAIL); });
  try { var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, cid); if (c) Com_s_(c.EMAIL).split(/[\s,;]+/).forEach(add); } catch (e) {}
  Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function (u) { if (Com_s_(u.CLIENTE_ID) === cid) Com_s_(u.EMAIL).split(/[\s,;]+/).forEach(add); });
  return l;
}

/**
 * Grava um contato (novo ou edição). d: { id?, clienteId, unidadeId, nome, cargo, papel, email, celular, telefone, principal, obs }.
 * Edição troca só os campos da tela; o histórico guarda o que mudou. Devolve o contato para a tela.
 */
function ComCt_salvar_(eu, d) {
  ComCt_exigir_(eu, 'salvar o contato');
  d = d || {};
  var nome = Com_texto_(d.nome, 160);
  if (nome.length < 3) throw new Error('Não foi possível salvar o contato: escreva o nome da pessoa (pelo menos 3 letras) e toque em Salvar contato de novo');
  var email = Com_s_(d.email).toLowerCase();
  if (email && !ComCt_emailOk_(email)) throw new Error('Não foi possível salvar o contato: o e-mail "' + email + '" não parece válido. Confira (exemplo: nome@hospital.com.br) ou deixe em branco');
  var cel = ComCt_digitos_(d.celular).replace(/^55(?=\d{11}$)/, '');
  if (cel && cel.length !== 11) throw new Error('Não foi possível salvar o contato: o celular precisa de DDD e 9 dígitos (11 números, por exemplo 62 99999-0000). Corrija ou deixe em branco');
  if (!email && !cel && !ComCt_digitos_(d.telefone)) throw new Error('Não foi possível salvar o contato: informe pelo menos um meio de contato (e-mail, celular ou telefone) e salve de novo');
  var papel = Com_up_(d.papel);
  if (papel && !COM_PAPEIS_CONTATO[papel]) papel = 'OUTRO';
  return Com_comTrava_(function () {
    var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(d.clienteId));
    if (!cli) throw new Error('Não foi possível salvar o contato: o cliente não foi encontrado no cadastro. Escolha o cliente de novo');
    var uid = Com_s_(d.unidadeId);
    if (uid) { var un = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, uid); if (!un || Com_s_(un.CLIENTE_ID) !== Com_s_(cli.ID)) throw new Error('Não foi possível salvar o contato: a unidade escolhida não é deste cliente. Escolha a unidade de novo ou deixe "Todas as unidades"'); }
    var campos = { CLIENTE_ID: Com_s_(cli.ID), UNIDADE_ID: uid, NOME: nome, CARGO: Com_texto_(d.cargo, 120), PAPEL: papel, EMAIL: email, CELULAR: cel, TELEFONE: Com_texto_(d.telefone, 40),
      PRINCIPAL: d.principal ? 'SIM' : '', OBS: Com_texto_(d.obs, 1000), ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() };
    var id = Com_s_(d.id), reg;
    if (id) {
      var atual = SGO_DATA.getById(COM_ABAS.CONTATOS, id);
      if (!atual || Com_s_(atual.CLIENTE_ID) !== Com_s_(cli.ID)) throw new Error('Não foi possível salvar o contato: ele não existe mais neste cliente. Atualize a lista');
      var mudou = ['NOME', 'CARGO', 'PAPEL', 'EMAIL', 'CELULAR', 'TELEFONE', 'UNIDADE_ID', 'PRINCIPAL'].filter(function (k) { return Com_s_(atual[k]) !== Com_s_(campos[k]); });
      SGO_DATA.update(COM_ABAS.CONTATOS, id, campos);
      Com_historico_('CONTATO', id, 'EDICAO', eu, { texto: 'Campos alterados: ' + (mudou.join(', ') || 'nenhum') + '.' });
      reg = Object.assign({}, atual, campos);
    } else {
      campos.ORIGEM = 'MANUAL'; campos.STATUS = 'ATIVO'; campos.CRIADO_POR_ID = eu.id; campos.CRIADO_POR_NOME = eu.nome;
      reg = SGO_DATA.insert(COM_ABAS.CONTATOS, campos);
      Com_historico_('CONTATO', reg.ID, 'CRIACAO', eu, { texto: 'Contato cadastrado para o cliente ' + (Com_s_(cli.NOME_FANTASIA) || Com_s_(cli.RAZAO_SOCIAL)) + '.' });
    }
    if (d.principal) {
      Com_ler_(COM_ABAS.CONTATOS).forEach(function (c) {
        if (Com_s_(c.ID) !== Com_s_(reg.ID) && Com_s_(c.CLIENTE_ID) === Com_s_(cli.ID) && Com_s_(c.UNIDADE_ID) === uid && Com_up_(c.PRINCIPAL) === 'SIM') SGO_DATA.update(COM_ABAS.CONTATOS, c.ID, { PRINCIPAL: '' });
      });
    }
    try { if (typeof EMAIL_INDICE_CLIENTES !== 'undefined') EMAIL_INDICE_CLIENTES = null; } catch (e) {}
    return ComCt_paraTela_(reg, null);
  });
}

/** Inativa (não apaga) com motivo. */
function ComCt_inativar_(eu, id, motivo) {
  ComCt_exigir_(eu, 'inativar o contato');
  var m = Com_texto_(motivo, 500);
  if (m.length < 5) throw new Error('Não foi possível inativar o contato: escreva o motivo (por exemplo "saiu do hospital") e confirme de novo. O contato fica no histórico');
  return Com_comTrava_(function () {
    var c = SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(id));
    if (!c) throw new Error('Não foi possível inativar: o contato não existe mais. Atualize a lista');
    SGO_DATA.update(COM_ABAS.CONTATOS, c.ID, { STATUS: 'INATIVO', PRINCIPAL: '', OBS: (Com_s_(c.OBS) + '\nInativado em ' + Com_br_(Com_agora_()) + ' por ' + eu.nome + ': ' + m).trim().slice(0, 1500), ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() });
    Com_historico_('CONTATO', c.ID, 'INATIVADO', eu, { texto: m });
    return { message: 'Contato inativado. Ele continua no histórico do cliente.' };
  });
}
