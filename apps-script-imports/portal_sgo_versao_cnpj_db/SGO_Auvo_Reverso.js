/****************************************************
 * SGO_Auvo_Reverso.js
 * INTEGRAÇÃO AUVO — Auvo -> SGO+ (sincronização reversa)
 *
 * Puxa Clientes/Unidades (agrupados por CNPJ raiz — Auvo não tem
 * conceito de "Unidade", só Customer) e Equipamentos do Auvo pro
 * Portal, em lotes retomáveis (evita estourar os 6min de execução do
 * Apps Script). Nunca duplica: 1ª linha de defesa é o mapeamento
 * reverso na aba AUVO_SYNC (por AUVO_ID); 2ª linha é casamento por
 * chave natural (CNPJ raiz pra Cliente, TAG pra Equipamento) contra
 * registros que já existiam manualmente no Portal antes desta
 * integração — só cria linha nova se nenhuma das duas achar nada.
 *
 * NUNCA SOBRESCREVE DADO EXISTENTE (corrigido após incidente real em
 * 2026-08-26 — ver memória do projeto): um registro casado por chave
 * natural só recebe merge se ORIGEM=AUVO (ou seja, foi ESTA integração
 * que criou ele antes) — e mesmo assim só preenche campo vazio, nunca
 * sobrescreve valor já preenchido (Auvo_mesclarComExistente_). Registro
 * com ORIGEM=MANUAL (ou em branco — todo cadastro anterior a esta
 * integração) é PROTEGIDO: nenhum campo é tocado, só ganha o
 * mapeamento AUVO_SYNC (Auvo_registroEhProtegido_).
 ****************************************************/

var AUVO_REV_CFG = {
  // As escritas de um lote inteiro são agrupadas em poucas chamadas
  // grandes à Sheets API (insertMany) em vez de uma chamada pequena por
  // registro — por isso o lote pode ser bem maior sem estourar os 6min
  // do Apps Script. O custo fixo por lote é o refetch paginado do Auvo
  // (repetido a cada lote, de propósito, pra sempre ler dado fresco).
  BATCH_SIZE: 150,
  CHECKPOINT_KEY: 'AUVO_REV_CHECKPOINT'
};

// ------------------------------------------------------------
// MAPEAMENTO REVERSO (aba AUVO_SYNC) — chave própria por AUVO_ID pra
// suportar N Customers do Auvo apontando pro MESMO Cliente do SGO
// (mesclagem por CNPJ raiz). A busca em memória (Auvo_construirIndiceMapeamento_)
// funciona igual pra linhas gravadas pela direção SGO->Auvo (CHAVE
// tipo:entidadeId) ou por esta direção reversa — o índice é montado
// pelo campo AUVO_ID, não pela CHAVE.
// ------------------------------------------------------------
function Auvo_chaveSyncPorAuvoId_(tipo, auvoId) {
  return tipo + ':AUVOID:' + auvoId;
}

function Auvo_construirIndiceMapeamento_() {
  var lista = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC);
  var porAuvoId = {};
  lista.forEach(function(m) {
    var tipo = SGO_UTILS.safeUpper(m.ENTIDADE_TIPO);
    var auvoId = String(m.AUVO_ID || '').trim();
    if (!tipo || !auvoId) return;
    if (!porAuvoId[tipo]) porAuvoId[tipo] = {};
    porAuvoId[tipo][auvoId] = m;
  });
  return porAuvoId;
}

function Auvo_construirIndiceClientesPorCnpjRaiz_() {
  var lista = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES);
  var indice = {};
  lista.forEach(function(c) {
    var raiz = Auvo_normalizarCnpjRaiz_(c.CNPJ);
    if (raiz && !indice[raiz]) indice[raiz] = c;
  });
  return indice;
}

function Auvo_construirIndiceEquipamentosPorTag_() {
  var lista = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
  var indice = {};
  lista.forEach(function(eq) {
    if (!eq.TAG) return;
    var chave = SGO_UTILS.safeUpper(eq.CLIENTE_ID) + '::' + SGO_UTILS.safeUpper(eq.TAG);
    indice[chave] = eq;
  });
  return indice;
}

function Auvo_construirIndicePorId_(nomeTabela) {
  var indice = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS[nomeTabela]).forEach(function(r) { indice[r.ID] = r; });
  return indice;
}

// ------------------------------------------------------------
// MESCLAGEM SEGURA — nunca sobrescreve campo que já tem valor. Um
// registro criado manualmente (ORIGEM=MANUAL ou em branco, ou seja,
// qualquer cadastro anterior a esta integração) é PROTEGIDO: nenhum
// campo dele é alterado, mesmo vazio — só ganha o mapeamento AUVO_SYNC
// pra runs futuras reconhecerem. Só registro com ORIGEM=AUVO (criado
// por uma rodada anterior desta mesma sincronização) recebe merge real
// (preenche o que ainda está vazio). Ver [[feedback_nunca_sobrescrever_campo_registro_existente_sem_merge]].
// ------------------------------------------------------------
function Auvo_registroEhProtegido_(registroAtual) {
  var origem = SGO_UTILS.safeUpper(registroAtual && registroAtual.ORIGEM);
  return origem !== 'AUVO'; // MANUAL, vazio, ou qualquer outra coisa = protegido
}

function Auvo_mesclarComExistente_(registroAtual, dadosNovos) {
  var saida = {};
  Object.keys(dadosNovos).forEach(function(campo) {
    var valorAtual = registroAtual ? registroAtual[campo] : '';
    var vazio = valorAtual === '' || valorAtual === null || valorAtual === undefined;
    saida[campo] = vazio ? dadosNovos[campo] : valorAtual;
  });
  return saida;
}

// ------------------------------------------------------------
// HELPERS DE DADO — puros, sem chamada a serviço nenhum (testáveis
// isoladamente num harness Node antes de tocar dado real)
// ------------------------------------------------------------
function Auvo_normalizarCnpjRaiz_(cnpj) {
  var digitos = SGO_UTILS.cnpjArmazenado(cnpj);
  return digitos.length >= 8 ? digitos.slice(0, 8) : '';
}

function Auvo_extrairCidadeUf_(endereco) {
  var texto = SGO_UTILS.safe(endereco);
  var m = texto.match(/,\s*([^,]+?)\s*-\s*([A-Za-z]{2})\s*$/);
  if (!m) return { cidade: '', uf: '' };
  return { cidade: m[1].trim(), uf: m[2].trim().toUpperCase() };
}

function Auvo_normalizarTexto_(texto) {
  return SGO_UTILS.safeUpper(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function Auvo_extrairEspecificacao_(equip, nomeAlvo) {
  var lista = (equip && equip.equipmentSpecifications) || [];
  var alvoNorm = Auvo_normalizarTexto_(nomeAlvo);
  for (var i = 0; i < lista.length; i++) {
    if (Auvo_normalizarTexto_(lista[i].name) === alvoNorm) return SGO_UTILS.safe(lista[i].specification);
  }
  return '';
}

function Auvo_extrairTipoEquipamento_(nomeCompleto) {
  var texto = SGO_UTILS.safe(nomeCompleto);
  var idx = texto.indexOf(' - ');
  return idx > -1 ? texto.slice(0, idx).trim() : texto.trim();
}

// ------------------------------------------------------------
// PAGINAÇÃO GENÉRICA — busca todas as páginas de um endpoint de
// listagem do Auvo (pageSize máximo documentado: 100).
// ------------------------------------------------------------
function Auvo_listarTudoPaginado_(endpoint) {
  var itens = [];
  var pagina = 1;
  var pageSize = AUVO_CFG.PAGE_SIZE_MAX;
  while (true) {
    var resp = Auvo_apiFetch_('get', endpoint + '?page=' + pagina + '&pageSize=' + pageSize, null);
    var lote = (resp.result && resp.result.entityList) || [];
    itens = itens.concat(lote);
    var paginacao = resp.result && resp.result.pagedSearchReturnData;
    var total = paginacao ? paginacao.totalItems : itens.length;
    if (lote.length === 0 || itens.length >= total) break;
    pagina++;
    if (pagina > 500) break; // trava de segurança contra loop infinito
  }
  return itens;
}

// ------------------------------------------------------------
// AGRUPAMENTO DE CLIENTES POR CNPJ RAIZ (8 primeiros dígitos, sem
// filial/DV) — heurística definida pelo usuário: mesmo CNPJ raiz com
// endereços diferentes = Unidades do mesmo Cliente. Customer sem CNPJ
// nunca mescla automaticamente (não é seguro adivinhar).
// ------------------------------------------------------------
function Auvo_agruparClientesPorCnpjRaiz_(customers) {
  var grupos = {};
  var semCnpj = [];
  (customers || []).forEach(function(c) {
    var raiz = Auvo_normalizarCnpjRaiz_(c.cpfCnpj);
    if (!raiz) { semCnpj.push(c); return; }
    if (!grupos[raiz]) grupos[raiz] = [];
    grupos[raiz].push(c);
  });
  var resultado = Object.keys(grupos).map(function(raiz) {
    return { cnpjRaiz: raiz, customers: grupos[raiz], multiplasUnidades: grupos[raiz].length > 1 };
  });
  semCnpj.forEach(function(c) {
    resultado.push({ cnpjRaiz: '', customers: [c], multiplasUnidades: false, semCnpj: true });
  });
  return resultado;
}

// Vínculos já definidos no portal prevalecem sobre a heurística de CNPJ raiz.
function Auvo_separarGruposPorVinculo_(grupos, indiceSync) {
  var maps=(indiceSync||{}).CLIENTE||{};
  return grupos.reduce(function(out,g){
    var owners=[...new Set(g.customers.map(function(c){return maps[String(c.id)]&&maps[String(c.id)].ENTIDADE_ID;}).filter(Boolean))];
    if(owners.length<=1){out.push(g);return out;}
    owners.forEach(function(id){var list=g.customers.filter(function(c){return maps[String(c.id)]&&String(maps[String(c.id)].ENTIDADE_ID)===String(id);});out.push(Object.assign({},g,{customers:list,multiplasUnidades:list.length>1}));});
    var unmapped=g.customers.filter(function(c){return !maps[String(c.id)];});
    if(unmapped.length)out.push(Object.assign({},g,{customers:unmapped,vinculoAmbiguo:true}));
    return out;
  },[]);
}

// ------------------------------------------------------------
// MAPEAMENTO DE CAMPOS — Auvo Customer/Equipment -> colunas do SGO
// ------------------------------------------------------------
function Auvo_mapearClienteReverso_(grupo) {
  var principal = grupo.customers[0];
  var nomeFantasia = SGO_UTILS.safe(principal.description);
  var razaoSocial = SGO_UTILS.safe(principal.legalName) || nomeFantasia;
  var email = (principal.email && principal.email[0]) || '';
  var telefone = (principal.phoneNumber && principal.phoneNumber[0]) || '';
  var contato = (principal.contacts && principal.contacts[0] && principal.contacts[0].name) || '';
  return {
    RAZAO_SOCIAL: razaoSocial || ('Cliente Auvo ' + principal.id),
    NOME_FANTASIA: nomeFantasia,
    CNPJ: SGO_UTILS.safe(principal.cpfCnpj),
    ENDERECO: SGO_UTILS.safe(principal.address),
    CONTATO: contato,
    EMAIL: email,
    TELEFONE: telefone,
    STATUS: principal.active === false ? SGO_CFG.STATUS.INATIVO : SGO_CFG.STATUS.ATIVO,
    ORIGEM: AUVO_CFG.ORIGEM.AUVO
  };
}

function Auvo_mapearUnidadeReversa_(customer, clienteIdSgo, rotuloDefault) {
  var enderecoInfo = Auvo_extrairCidadeUf_(customer.address);
  var contato = (customer.contacts && customer.contacts[0] && customer.contacts[0].name) || '';
  var telefone = (customer.phoneNumber && customer.phoneNumber[0]) || '';
  return {
    CLIENTE_ID: clienteIdSgo,
    NOME_UNIDADE: SGO_UTILS.safe(customer.description) || rotuloDefault,
    CNPJ_UNIDADE: SGO_UTILS.safe(customer.cpfCnpj),
    ENDERECO: SGO_UTILS.safe(customer.address),
    CIDADE: enderecoInfo.cidade,
    UF: enderecoInfo.uf,
    RESPONSAVEL: contato,
    TELEFONE: telefone,
    STATUS: customer.active === false ? SGO_CFG.STATUS.INATIVO : SGO_CFG.STATUS.ATIVO,
    ORIGEM: AUVO_CFG.ORIGEM.AUVO
  };
}

// Equipamento do Auvo sem NENHUM dado útil (TAG/FABRICANTE/MODELO/SÉRIE
// todos vazios) não vira registro no Portal — é lixo puro, não ajuda
// ninguém a achar nada e só suja o cadastro. Auditoria real (2026-08-26):
// só ~2% dos equipamentos caem nesse caso; os demais têm ao menos a TAG.
function Auvo_equipamentoTemDadoUtil_(dadosMapeados) {
  return !!(dadosMapeados.TAG || dadosMapeados.FABRICANTE || dadosMapeados.MODELO || dadosMapeados.SERIE);
}

function Auvo_mapearEquipamentoReverso_(equip, clienteIdSgo, unidadeIdSgo) {
  return {
    CLIENTE_ID: clienteIdSgo || '',
    UNIDADE_ID: unidadeIdSgo || '',
    TIPO: Auvo_extrairTipoEquipamento_(equip.name),
    FABRICANTE: Auvo_extrairEspecificacao_(equip, 'FABRICANTE'),
    MODELO: Auvo_extrairEspecificacao_(equip, 'MODELO'),
    SERIE: Auvo_extrairEspecificacao_(equip, 'SÉRIE') || Auvo_extrairEspecificacao_(equip, 'SERIE'),
    TAG: Auvo_extrairEspecificacao_(equip, 'ID') || SGO_UTILS.safe(equip.identifier),
    SETOR: '',
    STATUS: equip.active === false ? SGO_CFG.STATUS.INATIVO : SGO_CFG.STATUS.ATIVO,
    ORIGEM: AUVO_CFG.ORIGEM.AUVO
  };
}

// ------------------------------------------------------------
// PLANEJAMENTO (DRY-RUN) — nunca grava nada, só conta o que
// aconteceria. Obrigatório rodar antes da 1ª execução real.
// ------------------------------------------------------------
function Auvo_planejarClientesUnidades_(customers, indiceSync, indiceClientesPorCnpj, indiceClientesPorId) {
  var mapaClienteSync = indiceSync['CLIENTE'] || {};
  var mapaUnidadeSync = indiceSync['UNIDADE'] || {};
  var grupos = Auvo_separarGruposPorVinculo_(Auvo_agruparClientesPorCnpjRaiz_(customers), indiceSync);

  var plano = {
    totalGrupos: grupos.length,
    clientesCriar: 0,
    clientesAtualizar: 0,
    clientesProtegidos: 0,
    gruposSemCnpj: 0,
    unidadesCriar: 0,
    unidadesAtualizar: 0,
    amostraGrupos: [],
    amostraProtegidos: []
  };

  grupos.forEach(function(grupo) {
    if (grupo.semCnpj) plano.gruposSemCnpj++;

    var clienteIdExistente = null;
    for (var i = 0; i < grupo.customers.length; i++) {
      var m = mapaClienteSync[String(grupo.customers[i].id)];
      if (m) { clienteIdExistente = m.ENTIDADE_ID; break; }
    }
    if (!clienteIdExistente && grupo.cnpjRaiz && indiceClientesPorCnpj[grupo.cnpjRaiz]) {
      clienteIdExistente = indiceClientesPorCnpj[grupo.cnpjRaiz].ID;
    }

    if (!clienteIdExistente) {
      plano.clientesCriar++;
    } else {
      var registroAtual = indiceClientesPorId[clienteIdExistente];
      if (Auvo_registroEhProtegido_(registroAtual)) {
        plano.clientesProtegidos++;
        if (plano.amostraProtegidos.length < 15) {
          plano.amostraProtegidos.push({
            nomePortal: registroAtual ? (registroAtual.NOME_FANTASIA || registroAtual.RAZAO_SOCIAL) : clienteIdExistente,
            nomeAuvo: SGO_UTILS.safe(grupo.customers[0].description) || SGO_UTILS.safe(grupo.customers[0].legalName)
          });
        }
      } else {
        plano.clientesAtualizar++;
      }
    }

    grupo.customers.forEach(function(c) {
      if (mapaUnidadeSync[String(c.id)]) plano.unidadesAtualizar++; else plano.unidadesCriar++;
    });

    if (grupo.multiplasUnidades && plano.amostraGrupos.length < 15) {
      plano.amostraGrupos.push({
        cnpjRaiz: grupo.cnpjRaiz || '(sem CNPJ)',
        qtdUnidades: grupo.customers.length,
        nomes: grupo.customers.map(function(c) { return SGO_UTILS.safe(c.description) || SGO_UTILS.safe(c.legalName) || ('#' + c.id); })
      });
    }
  });

  return plano;
}

function Auvo_planejarEquipamentos_(equipamentos, indiceSync, indiceEquipPorId) {
  var mapaEquipSync = indiceSync['EQUIPAMENTO'] || {};
  var mapaUnidadeSync = indiceSync['UNIDADE'] || {};
  var plano = { total: equipamentos.length, criar: 0, atualizar: 0, protegidos: 0, semClienteMapeado: 0, ignoradosSemDado: 0 };

  equipamentos.forEach(function(eq) {
    var dados = Auvo_mapearEquipamentoReverso_(eq, '', '');
    if (!Auvo_equipamentoTemDadoUtil_(dados)) { plano.ignoradosSemDado++; return; }
    var m = mapaEquipSync[String(eq.id)];
    if (m && m.ENTIDADE_ID) {
      if (Auvo_registroEhProtegido_(indiceEquipPorId[m.ENTIDADE_ID])) plano.protegidos++; else plano.atualizar++;
    } else {
      plano.criar++;
    }
    if (!mapaUnidadeSync[String(eq.associatedCustomerId)]) plano.semClienteMapeado++;
  });

  return plano;
}

// ------------------------------------------------------------
// CHECKPOINT (Script Properties) — permite retomar um backfill grande
// em várias execuções sem estourar os 6min do Apps Script.
// ------------------------------------------------------------
function Auvo_lerCheckpointReverso_() {
  var raw = PropertiesService.getScriptProperties().getProperty(AUVO_REV_CFG.CHECKPOINT_KEY);
  if (!raw) return { fase: 'CLIENTES', indice: 0 };
  try { return JSON.parse(raw); } catch (e) { return { fase: 'CLIENTES', indice: 0 }; }
}

function Auvo_gravarCheckpointReverso_(cp) {
  // Fase 2 (16/10): guarda quando o checkpoint mudou (para a tela dizer "parada desde ...").
  cp = Object.assign({}, cp || {});
  if (!cp.atualizadoEm) cp.atualizadoEm = SGO_UTILS.nowIso();
  PropertiesService.getScriptProperties().setProperty(AUVO_REV_CFG.CHECKPOINT_KEY, JSON.stringify(cp));
}

/** Registra o motivo de uma parada no checkpoint, sem mudar fase nem índice. */
function Auvo_registrarErroReverso_(e) {
  try {
    var cp = Auvo_lerCheckpointReverso_();
    cp.ultimoErro = String(e && e.message ? e.message : e).slice(0, 300);
    cp.erroEm = SGO_UTILS.nowIso();
    PropertiesService.getScriptProperties().setProperty(AUVO_REV_CFG.CHECKPOINT_KEY, JSON.stringify(cp));
  } catch (e2) {}
}

// ------------------------------------------------------------
// EXECUÇÃO REAL — em lotes de AUVO_REV_CFG.BATCH_SIZE por chamada.
// Refaz o fetch+agrupamento a cada lote (rápido, só leitura) e usa o
// índice em memória pra decidir criar/atualizar/mesclar sem nunca
// duplicar. Idempotente: rodar de novo do zero é sempre seguro.
// ------------------------------------------------------------
// Calcula o que precisa ser escrito pra um grupo (SEM gravar nada) — a
// gravação de verdade acontece em lote no fim de Auvo_executarLoteClientes_
// (poucas chamadas grandes à Sheets API, em vez de várias pequenas por
// grupo — é isso que faz o lote inteiro rodar em segundos, não minutos).
function Auvo_calcularEscritaGrupoCliente_(grupo, indiceSync, indiceClientesPorCnpj, indiceClientesPorId, indiceUnidadesPorId) {
  if(grupo.vinculoAmbiguo)throw new Error('Há clientes distintos com esta raiz de CNPJ. Cadastre/vincule as novas unidades no portal antes de sincronizar.');
  var mapaClienteSync = indiceSync['CLIENTE'] || {};
  var mapaUnidadeSync = indiceSync['UNIDADE'] || {};

  var clienteIdSgo = null;
  for (var i = 0; i < grupo.customers.length; i++) {
    var m = mapaClienteSync[String(grupo.customers[i].id)];
    if (m) { clienteIdSgo = m.ENTIDADE_ID; break; }
  }
  if (!clienteIdSgo && grupo.cnpjRaiz && indiceClientesPorCnpj[grupo.cnpjRaiz]) {
    clienteIdSgo = indiceClientesPorCnpj[grupo.cnpjRaiz].ID;
  }

  var clientesMapeados = grupo.customers.map(function(c) { var m=mapaClienteSync[String(c.id)]; return m && m.ENTIDADE_ID; }).filter(Boolean);
  if ([...new Set(clientesMapeados)].length > 1) throw new Error('Este grupo Auvo tem filiais gerenciadas por clientes distintos. Sincronize os atendimentos individualmente e preserve os vínculos definidos pelo gestor.');
  var dadosCliente = Auvo_mapearClienteReverso_(grupo);
  var clienteNovo = !clienteIdSgo;
  var clienteId = clienteIdSgo || SGO_UTILS.uuid();
  var clienteAtual = clienteNovo ? null : indiceClientesPorId[clienteId];
  if(!clienteNovo&&!clienteAtual)throw new Error('Mapeamento Auvo aponta para cliente ausente. Confira o painel de vínculos.');
  if(clienteAtual){dadosCliente.CNPJ=clienteAtual.CNPJ;dadosCliente.STATUS=clienteAtual.STATUS;}
  var clienteProtegido = !clienteNovo && Auvo_registroEhProtegido_(clienteAtual);

  var out = {
    clienteId: clienteId,
    clienteAcao: clienteNovo ? 'criado' : (clienteProtegido ? 'vinculado_sem_alterar' : 'atualizado'),
    clienteInsert: clienteNovo ? Object.assign({ ID: clienteId }, dadosCliente) : null,
    clienteUpdate: (!clienteNovo && !clienteProtegido) ? { id: clienteId, dados: Auvo_mesclarComExistente_(clienteAtual, dadosCliente) } : null,
    mapeamentosNovos: [],
    unidadesInsert: [],
    unidadesUpdate: [],
    unidadesCriadas: 0,
    unidadesAtualizadas: 0,
    unidadesProtegidas: 0,
    unidadesPorAuvoId: {} // auvoId (customer.id) -> unidadeId no SGO, pra quem processa 1 customer só saber qual unidade foi essa
  };

  grupo.customers.forEach(function(c) {
    if (!mapaClienteSync[String(c.id)]) {
      out.mapeamentosNovos.push({ tipo: 'CLIENTE', entidadeId: clienteId, auvoId: String(c.id) });
    }
  });

  var rotuloUnico = grupo.customers.length === 1 ? 'Matriz' : null;
  grupo.customers.forEach(function(c) {
    var mu = mapaUnidadeSync[String(c.id)];
    var dadosUnidade = Auvo_mapearUnidadeReversa_(c, clienteId, rotuloUnico || ('Unidade ' + c.id));
    if (!mu) {
      var cnpjUnidade = SGO_UTILS.cnpjArmazenado(dadosUnidade.CNPJ_UNIDADE);
      var existentes = Object.keys(indiceUnidadesPorId).map(function(id) { return indiceUnidadesPorId[id]; }).concat(out.unidadesInsert).filter(function(u) {
        return cnpjUnidade && SGO_UTILS.cnpjArmazenado(u.CNPJ_UNIDADE) === cnpjUnidade;
      });
      if (existentes.length > 1) throw new Error('Já existe mais de uma unidade com o CNPJ ' + cnpjUnidade + '. Revise os cadastros antes de sincronizar.');
      if (existentes.length === 1) {
        if (String(existentes[0].CLIENTE_ID) !== String(clienteId)) throw new Error('Já existe unidade com este CNPJ vinculada a outro cliente. Revise o vínculo antes de sincronizar.');
        mu = { ENTIDADE_ID: existentes[0].ID };
        out.mapeamentosNovos.push({ tipo: 'UNIDADE', entidadeId: mu.ENTIDADE_ID, auvoId: String(c.id) });
        indiceUnidadesPorId[mu.ENTIDADE_ID] = existentes[0];
      }
    }
    if (mu && mu.ENTIDADE_ID) {
      out.unidadesPorAuvoId[String(c.id)] = mu.ENTIDADE_ID;
      var unidadeAtual = indiceUnidadesPorId[mu.ENTIDADE_ID];
      if (!unidadeAtual || !unidadeAtual.CLIENTE_ID || String(unidadeAtual.CLIENTE_ID)!==String(clienteId)) throw new Error('Unidade existente tem vínculo pendente ou cliente diferente. Confira o painel de vínculos antes de sincronizar.');
      if (Auvo_registroEhProtegido_(unidadeAtual)) {
        out.unidadesProtegidas++;
      } else {
        out.unidadesUpdate.push({ id: mu.ENTIDADE_ID, dados: Auvo_mesclarComExistente_(unidadeAtual, dadosUnidade) });
        out.unidadesAtualizadas++;
      }
    } else {
      var novoId = SGO_UTILS.uuid();
      out.unidadesPorAuvoId[String(c.id)] = novoId;
      out.unidadesInsert.push(Object.assign({ ID: novoId }, dadosUnidade));
      out.mapeamentosNovos.push({ tipo: 'UNIDADE', entidadeId: novoId, auvoId: String(c.id) });
      out.unidadesCriadas++;
    }
  });

  return out;
}

function Auvo_montarLinhaAuvoSync_(tipo, entidadeId, auvoId) {
  return {
    CHAVE: Auvo_chaveSyncPorAuvoId_(tipo, auvoId),
    ENTIDADE_TIPO: tipo,
    ENTIDADE_ID: entidadeId,
    AUVO_ID: auvoId,
    STATUS: AUVO_CFG.STATUS.OK,
    ULTIMA_SINCRONIZACAO: SGO_UTILS.nowIso(),
    ULTIMO_ERRO: ''
  };
}

function Auvo_executarLoteClientes_(cp) {
  var customers = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.CUSTOMERS);
  var grupos = Auvo_agruparClientesPorCnpjRaiz_(customers);
  var indiceSync = Auvo_construirIndiceMapeamento_();
  grupos = Auvo_separarGruposPorVinculo_(grupos, indiceSync);
  var indiceClientesPorCnpj = Auvo_construirIndiceClientesPorCnpjRaiz_();
  var indiceClientesPorId = Auvo_construirIndicePorId_('CAD_CLIENTES');
  var indiceUnidadesPorId = Auvo_construirIndicePorId_('CAD_UNIDADES');

  var inicio = cp.indice || 0;
  var fim = Math.min(inicio + AUVO_REV_CFG.BATCH_SIZE, grupos.length);
  var criados = 0, atualizados = 0, protegidos = 0;
  var unidadesCriadas = 0, unidadesAtualizadas = 0, unidadesProtegidas = 0, erros = [];

  var clientesInsert = [], clientesUpdate = [], unidadesInsert = [], unidadesUpdate = [], mapeamentosInsert = [];

  for (var i = inicio; i < fim; i++) {
    var grupo = grupos[i];
    try {
      var r = Auvo_calcularEscritaGrupoCliente_(grupo, indiceSync, indiceClientesPorCnpj, indiceClientesPorId, indiceUnidadesPorId);
      if (r.clienteAcao === 'criado') { criados++; clientesInsert.push(r.clienteInsert); }
      else if (r.clienteAcao === 'vinculado_sem_alterar') { protegidos++; }
      else { atualizados++; clientesUpdate.push(r.clienteUpdate); }
      unidadesInsert = unidadesInsert.concat(r.unidadesInsert);
      unidadesUpdate = unidadesUpdate.concat(r.unidadesUpdate);
      unidadesCriadas += r.unidadesCriadas;
      unidadesAtualizadas += r.unidadesAtualizadas;
      unidadesProtegidas += r.unidadesProtegidas;
      r.mapeamentosNovos.forEach(function(m) {
        mapeamentosInsert.push(Auvo_montarLinhaAuvoSync_(m.tipo, m.entidadeId, m.auvoId));
      });
    } catch (e) {
      erros.push((grupo.cnpjRaiz || 'sem-cnpj') + ': ' + e.message);
    }
  }

  if (clientesInsert.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.CAD_CLIENTES, clientesInsert);
  clientesUpdate.forEach(function(u) { SGO_DATA.update(SGO_CFG.SHEETS.CAD_CLIENTES, u.id, u.dados); });
  if (unidadesInsert.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.CAD_UNIDADES, unidadesInsert);
  unidadesUpdate.forEach(function(u) { SGO_DATA.update(SGO_CFG.SHEETS.CAD_UNIDADES, u.id, u.dados); });
  if (mapeamentosInsert.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.AUVO_SYNC, mapeamentosInsert);

  var novoIndice = fim;
  var concluidoFase = novoIndice >= grupos.length;
  Auvo_gravarCheckpointReverso_(concluidoFase ? { fase: 'EQUIPAMENTOS', indice: 0 } : { fase: 'CLIENTES', indice: novoIndice });

  return {
    fase: 'CLIENTES', criados: criados, atualizados: atualizados, protegidos: protegidos,
    unidadesCriadas: unidadesCriadas, unidadesAtualizadas: unidadesAtualizadas, unidadesProtegidas: unidadesProtegidas,
    progresso: novoIndice + '/' + grupos.length,
    concluido: false, erros: erros
  };
}

// Calcula o que fazer com 1 equipamento (SEM gravar) — mesmo padrão de
// Auvo_calcularEscritaGrupoCliente_: registro protegido (ORIGEM != AUVO)
// só ganha o mapeamento, nunca tem campo alterado.
function Auvo_calcularEscritaEquipamento_(eq, indiceSync, indiceUnidadesPorId, indiceEquipPorTag, indiceEquipPorId) {
  var mapaUnidadeSync = indiceSync['UNIDADE'] || {};
  var mapaEquipSync = indiceSync['EQUIPAMENTO'] || {};

  var dadosEquipTeste = Auvo_mapearEquipamentoReverso_(eq, '', '');
  if (!Auvo_equipamentoTemDadoUtil_(dadosEquipTeste)) return { acao: 'ignorado_sem_dado' };

  var mu = mapaUnidadeSync[String(eq.associatedCustomerId)];
  var unidadeIdSgo = mu ? mu.ENTIDADE_ID : '';
  var clienteIdSgo = '';
  var semUnidadeVinculada = false;
  if (unidadeIdSgo && indiceUnidadesPorId[unidadeIdSgo]) {
    clienteIdSgo = indiceUnidadesPorId[unidadeIdSgo].CLIENTE_ID;
  } else {
    semUnidadeVinculada = true;
  }

  var dadosEquip = Auvo_mapearEquipamentoReverso_(eq, clienteIdSgo, unidadeIdSgo);
  var me = mapaEquipSync[String(eq.id)];
  var equipIdExistente = me && me.ENTIDADE_ID ? me.ENTIDADE_ID : null;

  if (!equipIdExistente) {
    var chaveNatural = SGO_UTILS.safeUpper(clienteIdSgo) + '::' + SGO_UTILS.safeUpper(dadosEquip.TAG);
    var existenteManual = dadosEquip.TAG ? indiceEquipPorTag[chaveNatural] : null;
    if (existenteManual) equipIdExistente = existenteManual.ID;
  }

  if (!equipIdExistente) {
    var novoId = SGO_UTILS.uuid();
    return {
      acao: 'criado', semUnidadeVinculada: semUnidadeVinculada,
      equipInsert: Object.assign({ ID: novoId }, dadosEquip),
      mapeamentoNovo: { tipo: 'EQUIPAMENTO', entidadeId: novoId, auvoId: String(eq.id) }
    };
  }

  var equipAtual = indiceEquipPorId[equipIdExistente];
  if (Auvo_registroEhProtegido_(equipAtual)) {
    return {
      acao: 'protegido', semUnidadeVinculada: semUnidadeVinculada,
      mapeamentoNovo: me ? null : { tipo: 'EQUIPAMENTO', entidadeId: equipIdExistente, auvoId: String(eq.id) }
    };
  }

  return {
    acao: 'atualizado', semUnidadeVinculada: semUnidadeVinculada,
    equipUpdate: { id: equipIdExistente, dados: Auvo_mesclarComExistente_(equipAtual, dadosEquip) },
    mapeamentoNovo: me ? null : { tipo: 'EQUIPAMENTO', entidadeId: equipIdExistente, auvoId: String(eq.id) }
  };
}

function Auvo_executarLoteEquipamentos_(cp) {
  var equipamentos = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.EQUIPMENTS);
  var indiceSync = Auvo_construirIndiceMapeamento_();
  var indiceUnidadesPorId = Auvo_construirIndicePorId_('CAD_UNIDADES');
  var indiceEquipPorTag = Auvo_construirIndiceEquipamentosPorTag_();
  var indiceEquipPorId = Auvo_construirIndicePorId_('CAD_EQUIPAMENTOS');

  var inicio = cp.indice || 0;
  var fim = Math.min(inicio + AUVO_REV_CFG.BATCH_SIZE, equipamentos.length);
  var criados = 0, atualizados = 0, protegidos = 0, semUnidade = 0, ignoradosSemDado = 0, erros = [];
  var equipInsert = [], equipUpdate = [], mapeamentosInsert = [];

  for (var i = inicio; i < fim; i++) {
    var eq = equipamentos[i];
    try {
      var r = Auvo_calcularEscritaEquipamento_(eq, indiceSync, indiceUnidadesPorId, indiceEquipPorTag, indiceEquipPorId);
      if (r.acao === 'ignorado_sem_dado') { ignoradosSemDado++; continue; }
      if (r.semUnidadeVinculada) semUnidade++;
      if (r.acao === 'criado') { criados++; equipInsert.push(r.equipInsert); }
      else if (r.acao === 'protegido') { protegidos++; }
      else { atualizados++; equipUpdate.push(r.equipUpdate); }
      if (r.mapeamentoNovo) mapeamentosInsert.push(Auvo_montarLinhaAuvoSync_(r.mapeamentoNovo.tipo, r.mapeamentoNovo.entidadeId, r.mapeamentoNovo.auvoId));
    } catch (e) {
      erros.push('Equip #' + eq.id + ': ' + e.message);
    }
  }

  if (equipInsert.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, equipInsert);
  equipUpdate.forEach(function(u) { SGO_DATA.update(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, u.id, u.dados); });
  if (mapeamentosInsert.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.AUVO_SYNC, mapeamentosInsert);

  var novoIndice = fim;
  var concluidoTudo = novoIndice >= equipamentos.length;
  Auvo_gravarCheckpointReverso_(concluidoTudo
    ? { fase: 'CONCLUIDO', indice: 0, concluidoEm: SGO_UTILS.nowIso() }
    : { fase: 'EQUIPAMENTOS', indice: novoIndice });

  return {
    fase: 'EQUIPAMENTOS', criados: criados, atualizados: atualizados, protegidos: protegidos,
    semUnidadeVinculada: semUnidade, ignoradosSemDado: ignoradosSemDado,
    progresso: novoIndice + '/' + equipamentos.length,
    concluido: concluidoTudo, erros: erros
  };
}

function Auvo_executarLoteReverso_() {
  Auvo_bootstrap_();
  var cp = Auvo_lerCheckpointReverso_();
  if (cp.fase === 'CLIENTES') return Auvo_executarLoteClientes_(cp);
  if (cp.fase === 'EQUIPAMENTOS') return Auvo_executarLoteEquipamentos_(cp);
  return { fase: 'CONCLUIDO', concluido: true };
}

// ------------------------------------------------------------
// CONTINUAÇÃO AUTOMÁTICA (trigger de 1 disparo) — usada tanto pelo
// backfill inicial (grande, várias execuções) quanto pela sincronização
// diária (Fase A roda sempre um resync completo — reprocessar tudo é
// idempotente e mais simples/seguro do que filtrar por "o que mudou").
// ------------------------------------------------------------
function Auvo_agendarContinuacaoReversa_() {
  var jaExiste = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'Auvo_continuarViaTrigger_';
  });
  if (jaExiste) return;
  ScriptApp.newTrigger('Auvo_continuarViaTrigger_').timeBased().after(60 * 1000).create();
}

function Auvo_continuarViaTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_continuarViaTrigger_') ScriptApp.deleteTrigger(t);
  });
  var resultado;
  try { resultado = Auvo_executarLoteReverso_(); } catch (e) { Auvo_registrarErroReverso_(e); throw e; }
  if (!resultado.concluido && resultado.fase !== 'CONCLUIDO') {
    Auvo_agendarContinuacaoReversa_();
  }
}

function Auvo_configurarTriggerDiarioReverso_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_dispararSincronizacaoReversaDiaria_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('Auvo_dispararSincronizacaoReversaDiaria_')
    .timeBased().atHour(4).everyDays(1).inTimezone('America/Sao_Paulo').create();
}

function Auvo_dispararSincronizacaoReversaDiaria_() {
  Auvo_bootstrap_();
  Auvo_gravarCheckpointReverso_({ fase: 'CLIENTES', indice: 0 });
  var resultado = Auvo_executarLoteReverso_();
  if (!resultado.concluido && resultado.fase !== 'CONCLUIDO') {
    Auvo_agendarContinuacaoReversa_();
  }
}

// ------------------------------------------------------------
// FUNÇÕES EXPOSTAS AO PAINEL (todas atrás de admin)
// ------------------------------------------------------------
function Auvo_apiSimularSincronizacaoReversa(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();
  var customers = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.CUSTOMERS);
  var equipamentos = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.EQUIPMENTS);
  var indiceSync = Auvo_construirIndiceMapeamento_();
  var indiceClientesPorCnpj = Auvo_construirIndiceClientesPorCnpjRaiz_();
  var indiceClientesPorId = Auvo_construirIndicePorId_('CAD_CLIENTES');
  var indiceEquipPorId = Auvo_construirIndicePorId_('CAD_EQUIPAMENTOS');

  var planoClientes = Auvo_planejarClientesUnidades_(customers, indiceSync, indiceClientesPorCnpj, indiceClientesPorId);
  var planoEquip = Auvo_planejarEquipamentos_(equipamentos, indiceSync, indiceEquipPorId);

  return { ok: true, clientes: planoClientes, equipamentos: planoEquip };
}

function Auvo_apiIniciarSincronizacaoReversa(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();
  Auvo_gravarCheckpointReverso_({ fase: 'CLIENTES', indice: 0 });
  return Auvo_apiContinuarSincronizacaoReversa(sessionId);
}

function Auvo_apiContinuarSincronizacaoReversa(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();
  var resultado;
  try { resultado = Auvo_executarLoteReverso_(); } catch (e) { Auvo_registrarErroReverso_(e); throw e; }
  if (!resultado.concluido && resultado.fase !== 'CONCLUIDO') {
    Auvo_agendarContinuacaoReversa_();
  }
  return Object.assign({ ok: true }, resultado);
}

function Auvo_apiStatusSincronizacaoReversa(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  // Fase 2 (16/10): diz se já houve importação e se a continuação automática está agendada,
  // para a tela não mostrar "em andamento" quando nada roda (operador no limbo).
  var existe = !!PropertiesService.getScriptProperties().getProperty(AUVO_REV_CFG.CHECKPOINT_KEY);
  var agendado = false;
  try {
    agendado = ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === 'Auvo_continuarViaTrigger_'; });
  } catch (e) {}
  var credenciais = true;
  try { credenciais = !!(PropertiesService.getScriptProperties().getProperty('AUVO_API_KEY') && PropertiesService.getScriptProperties().getProperty('AUVO_API_TOKEN')); } catch (e) {}
  return { ok: true, checkpoint: Auvo_lerCheckpointReverso_(), existe: existe, agendado: agendado, credenciais: credenciais };
}

function Auvo_apiAtivarSincronizacaoDiaria(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_configurarTriggerDiarioReverso_();
  return { ok: true, message: 'Sincronização diária Auvo -> Portal agendada pra 04:00 (horário de Brasília).' };
}
