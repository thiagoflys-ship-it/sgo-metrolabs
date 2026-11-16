/****************************************************
 * COMERCIAL — DADOS COMPLETOS PARA EMITIR A PROPOSTA (11/11/2026)
 *
 * Pedido do dono (11/11/2026): "crie algo para que não deixe o vendedor criar cadastro faltando algo, faltando dados obrigar ele
 * a pedir os dados e só emitir orçamento após o cliente enviar os dados completos para não faltar nada".
 * Caso que motivou: PROP-2026-0027 (quatro serviços de qualificação sem nenhum equipamento identificado, escopo "Conforme os itens
 * da tabela", contato sem e-mail). A revisão da gestora já apontava parte disso, mas só como alerta.
 *
 * Regra: o RASCUNHO continua livre (salvar e concluir não mudam). EMITIR = gerar o documento A4 (o link de assinatura, o "Enviar
 * ao cliente" e o "Entregue por outro meio" exigem o documento, então ficam cobertos). Antes de gerar, o servidor confere a lista
 * abaixo; faltando algo, recusa dizendo o quê, por quê e o que fazer (ComDE_exigirParaEmitir_). Documento gerado antes desta versão
 * segue valendo (envio, link, aceite); gerar de novo ou fazer nova revisão passa pela conferência.
 *
 * Lista de dados obrigatórios para emitir (critério do processo comercial de engenharia clínica e metrologia; nenhuma regra de preço):
 *  1. Cliente (cadastro completo de 29/10/2026, CadQ_problemasCliente_): CNPJ ou CPF válido, razão social, endereço de faturamento
 *     completo (CEP, logradouro, número, bairro, cidade, UF), e-mail do cliente (nota fiscal e cobrança) e o contato responsável
 *     com telefone. Por quê: nota fiscal, cobrança e certificado saem destes dados; corrigir depois custa nota cancelada e retrabalho.
 *  2. Unidade da proposta: CNPJ válido quando informado; cidade e UF (local de execução). Por quê: a viagem e a agenda técnica saem
 *     do local; o certificado diz onde o serviço foi feito.
 *  3. Contato da proposta (A/C): nome, e-mail válido e telefone (celular ou fixo, com DDD). Por quê: é quem recebe a proposta, o
 *     link de assinatura e o agendamento.
 *  4. Item de serviço técnico (qualificação, calibração, manutenção, NR-13, ensaio, inspeção...): o equipamento identificado, um por
 *     unidade do item (quantidade 2 = dois equipamentos): ou o vínculo ao cadastro de equipamentos do cliente, ou os dados mínimos
 *     (tipo, marca, modelo, número de série, setor ou local e, para autoclave, lavadora, termodesinfectora, secadora, estufa, câmara,
 *     refrigerador e semelhantes, a capacidade ou volume). Produto e peça não exigem. Serviço sem equipamento (treinamento,
 *     consultoria, elaboração de documentos, taxa...) não exige. Por quê: o preço, o plano de ensaio, os padrões e o relatório
 *     dependem do equipamento; proposta sem equipamento vira discussão na execução e certificado com dado errado.
 *  5. Escopo: a descrição da proposta não pode ser genérica ("conforme itens da tabela", "a combinar"...). Em branco vale (decisão
 *     do dono de 28/10/2026) só quando cada serviço técnico tem descrição própria (detalhe do item ou o descritivo do catálogo
 *     oficial). Descrição de item genérica ("Serviço", "Conforme orçamento") também falta. Por quê: o escopo é o que o cliente
 *     compra e o que a técnica executa; genérico não protege nenhum dos dois lados.
 *
 * Pedir ao cliente: o vendedor gera um pedido com a lista exata (texto pronto para e-mail e WhatsApp) e um link público com token
 * (/dados-cliente/#token, mesmo modelo de segurança do /orcamento/: token de 64 hexadecimais, só o resumo SHA-256 fica guardado,
 * limite por IP, validade de 30 dias, uma resposta por link). O cliente vê só a lista do que falta (sem valores, sem os dados já
 * cadastrados). O que ele envia fica PENDENTE DE CONFERÊNCIA: nada entra no cadastro até o vendedor (ou a gestão) conferir campo a
 * campo e aceitar. A proposta fica "Aguardando dados do cliente" (DADOS_SITUACAO), com atividade de cobrança em Minhas atividades
 * (2 dias úteis), item na lista do dia da gestora e, quando o cliente responde, aviso ao vendedor (sistema na hora; e-mail só no
 * expediente, pelo envio comum do Comercial) e atividade "Conferir os dados".
 *
 * Liberação excepcional: só Diretoria, Administrador ou o dono, com motivo escrito (20 letras ou mais). Cobre as faltas daquele
 * momento, naquela revisão; falta nova ou nova revisão precisa de nova liberação. Fica no histórico da proposta e o vendedor é avisado.
 * Por quê existe: há casos reais em que o cliente só informa o equipamento depois do contrato (licitação por lote, emergência com
 * equipamento parado, orçamento para investimento); sem a válvula, o vendedor inventaria dado para passar pela trava.
 *
 * Desligar sem nova versão (reversão): propriedade COM_DADOS_EMISSAO_CFG = {"ligada":false}. O quadro continua aparecendo como aviso.
 * Nenhuma função devolve Date cru. Funções públicas do link terminam em "_" (o /api/run não as chama).
 ****************************************************/

var COM_DE_PROP_CFG = 'COM_DADOS_EMISSAO_CFG';
var COM_DE_LINK_DIAS = 30;
var COM_DE_MAX_SLOTS = 50;
var COM_DE_SEM_EQUIP = /treinament|capacita|\bcurso|palestra|consultori|assessori|elabora[cç][aã]o|\bprojeto|\bplano de|\bpgt\b|\bpop\b|procedimento|documenta[cç]|auditori|\btaxa|frete|deslocament|di[aá]ria|estadia|hospedage|alimenta[cç]|\bmensalidade|licen[cç]a de software|assinatura de software/i;
var COM_DE_CAPACIDADE = /autoclave|esteriliz|lavadora|termodesinf|ultrass|secadora|estufa|banho[\s-]?maria|c[aâ]mara|refrigerador|geladeira|freezer|incubadora|vaso de press|caldeira|reservat[oó]rio|tanque/i;
var COM_DE_UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
var COM_DE_SITUACOES = { AGUARDANDO_CLIENTE: 'Aguardando dados do cliente', RESPONDIDO: 'Dados do cliente a conferir' };
var COM_DE_GRUPOS = { INTERMEDIARIO: 'Intermediário e comissão (só interno)', CLIENTE: 'Cadastro do cliente (faturamento)', UNIDADE: 'Local de execução', CONTATO: 'Contato da proposta', EQUIPAMENTO: 'Equipamentos dos serviços', ESCOPO: 'Escopo e descrição' };

/** Rótulos e tipo de cada campo pedido (chave sem o prefixo). */
var COM_DE_CAMPOS = {
  CLI: {
    CNPJ: { r: 'CNPJ (ou CPF, se for pessoa física)', t: 'doc' }, RAZAO_SOCIAL: { r: 'Razão social (como na nota fiscal)', t: 'texto' }, CEP: { r: 'CEP do endereço de faturamento', t: 'cep' },
    LOGRADOURO: { r: 'Logradouro (rua, avenida) do faturamento', t: 'texto' }, NUMERO: { r: 'Número', t: 'texto' }, COMPLEMENTO: { r: 'Complemento (se houver)', t: 'texto', opcional: true },
    BAIRRO: { r: 'Bairro', t: 'texto' }, CIDADE: { r: 'Cidade do faturamento', t: 'texto' }, UF: { r: 'UF do faturamento', t: 'uf' },
    EMAIL: { r: 'E-mail para nota fiscal e cobrança', t: 'email' }, CONTATO: { r: 'Nome do responsável pelo cadastro (compras ou financeiro)', t: 'texto' },
    TELEFONE: { r: 'Telefone do cliente (com DDD)', t: 'tel' }
  },
  CT: { NOME: { r: 'Nome completo do responsável técnico que recebe a proposta', t: 'texto' }, CARGO: { r: 'Cargo do responsável técnico (ex.: engenheira clínica)', t: 'texto' }, EMAIL: { r: 'E-mail de quem recebe a proposta', t: 'email' }, TELEFONE: { r: 'Telefone ou celular de quem recebe a proposta (com DDD)', t: 'tel' } },
  UN: { CIDADE: { r: 'Cidade onde o serviço será executado', t: 'texto' }, UF: { r: 'UF onde o serviço será executado', t: 'uf' } },
  EQ: { TIPO: { r: 'Tipo do equipamento', t: 'texto' }, MARCA: { r: 'Marca (fabricante)', t: 'texto' }, MODELO: { r: 'Modelo', t: 'texto' }, SERIE: { r: 'Número de série', t: 'texto' },
    CAPACIDADE: { r: 'Capacidade ou volume (ex.: 100 L)', t: 'texto' }, SETOR: { r: 'Setor ou local (ex.: CME, farmácia)', t: 'texto' } },
  EQC: { TIPO: { r: 'Tipo do equipamento', t: 'texto' }, FABRICANTE: { r: 'Marca (fabricante)', t: 'texto' }, MODELO: { r: 'Modelo', t: 'texto' }, SERIE: { r: 'Número de série', t: 'texto' },
    CAPACIDADE: { r: 'Capacidade ou volume (ex.: 100 L)', t: 'texto' }, SETOR: { r: 'Setor ou local (ex.: CME, farmácia)', t: 'texto' } }
};

// ------------------------------------------------------------
// CONFIGURAÇÃO E AUXILIARES
// ------------------------------------------------------------
function ComDE_cfg_() {
  var c = {};
  try { c = Com_json_(PropertiesService.getScriptProperties().getProperty(COM_DE_PROP_CFG), {}) || {}; } catch (e) { c = {}; }
  return { ligada: c.ligada !== false };
}
function ComDE_dig_(v) { return Com_s_(v).replace(/\D/g, ''); }
function ComDE_emailOk_(v) { return /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(Com_s_(v)); }
function ComDE_telOk_(v) { var d = ComDE_dig_(v); if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2); return d.length === 10 || d.length === 11; }
function ComDE_cnpjOk_(v) {
  if (typeof CadQ_cnpjOk_ === 'function') return CadQ_cnpjOk_(v);
  var d = ComDE_dig_(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  var calc = function (n) { var pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], s = 0; for (var i = 0; i < n; i++) s += Number(d.charAt(i)) * pesos[i]; var r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(d.charAt(12)) && calc(13) === Number(d.charAt(13));
}
function ComDE_cpfOk_(v) {
  var d = ComDE_dig_(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(d.charAt(i)) * (t + 1 - i); var r = (s * 10) % 11 % 10; if (r !== Number(d.charAt(t))) return false; }
  return true;
}
function ComDE_lerSeguro_(aba) { try { return Com_ler_(aba); } catch (e) { return []; } }

/** Texto genérico (não descreve nada): vazio, curto demais ou fórmulas como "conforme itens da tabela", "a combinar". */
function ComDE_generico_(texto, minimo) {
  var n = Com_normBusca_(texto);
  if (n.length < (minimo || 12)) return true;
  if (/^(conforme|segundo|de acordo com|vide|ver|idem|mesmo|referente)\b.{0,40}\b(itens?|tabela|proposta|orcamento|anexo|solicitad[oa]|solicitacao|combinado|descricao|pedido|planilha|abaixo|acima)\b/.test(n) && n.length < 80) return true;
  if (/^(a combinar|a definir|diversos|servicos? diversos|outros|teste|xxx+|n a|nao se aplica|sem descricao|servico|produto|item)$/.test(n)) return true;
  return false;
}

/** Item que precisa do equipamento identificado: serviço ou contrato (não automático), fora da lista de serviços sem equipamento. */
function ComDE_exigeEquipamento_(i) {
  if (!i || i.auto) return false;
  var tipo = Com_up_(i.tipo) || 'SERVICO';
  if (tipo === 'PRODUTO') return false;
  var txt = [i.descricao, i.codigo, i.detalhe && Com_s_(i.detalhe).slice(0, 200)].map(Com_s_).join(' ');
  return !COM_DE_SEM_EQUIP.test(Com_s_(i.descricao) + ' ' + Com_s_(i.codigo)) || /qualifica|calibra|manuten|nr[\s-]?13|ensaio|inspe[cç]/i.test(txt) && !COM_DE_SEM_EQUIP.test(Com_s_(i.descricao));
}
/** Quantos equipamentos o item precisa: um por unidade (un., equip., peça...); horas, meses, pontos = pelo menos um. */
function ComDE_qtdEquipamentos_(i) {
  if (Com_up_(i.tipo) === 'CONTRATO') return 1;
  var u = Com_normBusca_(i.unidade).replace(/\s+/g, '');
  var porUnidade = !u || /^(un|und|unid|unidade|unidades|equip|equipamento|equipamentos|eq|pc|peca|pecas|servico|servicos|sv|ud)s?$/.test(u);
  var q = Number(i.quantidade) || 1;
  if (!porUnidade || Math.floor(q) !== q || q < 1) return 1;
  return Math.min(q, COM_DE_MAX_SLOTS);
}
function ComDE_exigeCapacidade_(tipoTexto) { return COM_DE_CAPACIDADE.test(Com_s_(tipoTexto)); }

/** Equipamentos identificados de um item: vínculos ao cadastro (sem repetir) e dados informados. [{ origem, equipamentoId, dados, faltam[] }] */
function ComDE_identificados_(i, eqs, tipoItem) {
  var l = [], vistos = {};
  var lista = [];
  if (Com_s_(i.equipamentoId)) lista.push({ equipamentoId: Com_s_(i.equipamentoId) });
  (Array.isArray(i.equipamentos) ? i.equipamentos : []).forEach(function (e) { if (e) lista.push(e); });
  lista.forEach(function (e) {
    var id = Com_s_(e.equipamentoId);
    if (id) {
      if (vistos[id]) return; vistos[id] = 1;
      var c = eqs[id];
      if (!c) { l.push({ origem: 'CADASTRO', equipamentoId: id, texto: 'equipamento do cadastro que não existe mais', faltam: ['TIPO', 'FABRICANTE', 'MODELO', 'SERIE', 'SETOR'], inexistente: true }); return; }
      var tipoTxt = Com_s_(c.TIPO) || tipoItem;
      var fl = ['TIPO', 'FABRICANTE', 'MODELO', 'SERIE', 'SETOR'].filter(function (k) { return !Com_s_(c[k]); });
      if (ComDE_exigeCapacidade_(tipoTxt + ' ' + tipoItem) && !Com_s_(c.CAPACIDADE)) fl.push('CAPACIDADE');
      l.push({ origem: 'CADASTRO', equipamentoId: id, texto: [Com_s_(c.TIPO), Com_s_(c.TAG) ? 'TAG ' + Com_s_(c.TAG) : '', Com_s_(c.SERIE) ? 'série ' + Com_s_(c.SERIE) : ''].filter(Boolean).join(' · ') || 'equipamento ' + id, faltam: fl });
      return;
    }
    var d = { TIPO: Com_s_(e.tipo), MARCA: Com_s_(e.marca), MODELO: Com_s_(e.modelo), SERIE: Com_s_(e.serie), CAPACIDADE: Com_s_(e.capacidade), SETOR: Com_s_(e.setor) };
    if (!d.TIPO && !d.MARCA && !d.MODELO && !d.SERIE && !d.SETOR) return;
    var f2 = ['TIPO', 'MARCA', 'MODELO', 'SERIE', 'SETOR'].filter(function (k) { return !d[k]; });
    if (ComDE_exigeCapacidade_(d.TIPO + ' ' + tipoItem) && !d.CAPACIDADE) f2.push('CAPACIDADE');
    l.push({ origem: Com_up_(e.origem) || 'VENDEDOR', equipamentoId: '', texto: [d.TIPO, d.MARCA, d.MODELO, d.SERIE ? 'série ' + d.SERIE : ''].filter(Boolean).join(' · '), faltam: f2 });
  });
  return l;
}

// ------------------------------------------------------------
// A CONFERÊNCIA (lista de faltas)
// ------------------------------------------------------------
/**
 * Faltas para emitir a proposta. Cada falta: { id, grupo, oQue, porque, comoResolver, quem ('CLIENTE' | 'INTERNO' | 'AMBOS'),
 * pedivel (o cliente pode informar pelo link), campos: [chaves pedidas], alvo: { tipo, ... } }. Lista vazia = pode emitir.
 */
function ComDE_faltas_(p) {
  var faltas = [], add = function (f) { faltas.push(f); };
  var itens = (Com_json_(p.ITENS_JSON, []) || []).filter(function (i) { return i && !i.auto; });
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  var un = Com_s_(p.UNIDADE_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(p.UNIDADE_ID)) || null : null;
  var ct = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) || null : null;
  var porqueCli = 'A nota fiscal, a cobrança e o certificado saem do cadastro do cliente; dado faltando ou errado vira nota cancelada e retrabalho.';
  // 1. cliente (a mesma regra do "cadastro completo" de 29/10/2026)
  var probs = typeof CadQ_problemasCliente_ === 'function' ? CadQ_problemasCliente_(cli) : ComDE_problemasClienteBasico_(cli);
  var camposCli = {};
  probs.forEach(function (pr) {
    var cps = (pr.campos || []).map(function (k) { return k === 'CPF' ? 'CNPJ' : k; });
    if (pr.codigo === 'ENDERECO_INCOMPLETO' && cps.indexOf('COMPLEMENTO') < 0) cps.push('COMPLEMENTO');
    cps.forEach(function (k) { camposCli[k] = 1; });
    add({ id: 'CLI.' + pr.codigo, grupo: 'CLIENTE', oQue: pr.texto.replace(/^Contato sem e-mail$/, 'Cliente sem o e-mail para nota fiscal e cobrança').replace(/^Contato sem telefone$/, 'Cliente sem telefone no cadastro').replace(/^Sem o nome do contato responsável$/, 'Cadastro do cliente sem o nome do responsável'),
      porque: porqueCli, comoResolver: 'Peça ao cliente (botão "Pedir ao cliente") ou, se você já recebeu do cliente, toque em "Preencher agora". Não use dado buscado na internet.',
      quem: 'AMBOS', pedivel: true, campos: cps.filter(function (k) { return COM_DE_CAMPOS.CLI[k]; }).map(function (k) { return 'CLI.' + k; }), alvo: { tipo: 'CLIENTE', id: Com_s_(cli.ID) } });
  });
  // 2. unidade (CNPJ válido quando informado; cidade e UF do local de execução)
  var temServico = itens.some(ComDE_exigeEquipamento_);
  if (un) {
    if (ComDE_dig_(un.CNPJ_UNIDADE) && !ComDE_cnpjOk_(un.CNPJ_UNIDADE)) add({ id: 'UN.CNPJ', grupo: 'UNIDADE', oQue: 'CNPJ da unidade ' + Com_s_(un.NOME_UNIDADE) + ' inválido', porque: 'O documento e a pasta do cliente usam o CNPJ da unidade; inválido, a nota sai para o CNPJ errado.',
      comoResolver: 'Corrija o CNPJ da unidade em Cadastros > Unidades (confira com o cliente) ou apague-o, se a unidade fatura pelo CNPJ do cliente.', quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'UNIDADE_CADASTRO', id: Com_s_(un.ID) } });
    var fl = [];
    if (!Com_s_(un.CIDADE)) fl.push('CIDADE');
    if (COM_DE_UFS.indexOf(Com_up_(un.UF)) < 0) fl.push('UF');
    if (fl.length) add({ id: 'UN.LOCAL', grupo: 'UNIDADE', oQue: 'Unidade ' + Com_s_(un.NOME_UNIDADE) + ' sem ' + (fl.length === 2 ? 'cidade e UF' : fl[0] === 'UF' ? 'UF' : 'cidade') + ' (local de execução)',
      porque: 'O custo da viagem, a agenda da técnica e o certificado dependem de onde o serviço é feito.', comoResolver: 'Peça ao cliente ou toque em "Preencher agora".', quem: 'AMBOS', pedivel: true,
      campos: fl.map(function (k) { return 'UN.' + k; }), alvo: { tipo: 'UNIDADE', id: Com_s_(un.ID) } });
  }
  // 3. contato da proposta
  var porqueCt = 'É quem recebe a proposta, o link de assinatura e o agendamento; sem e-mail e telefone a proposta não chega e o retorno não acontece.';
  if (!ct) add({ id: 'CT.FALTA', grupo: 'CONTATO', oQue: 'A proposta não tem o responsável técnico do cliente (A/C)', porque: porqueCt,
    comoResolver: 'No rascunho, escolha o contato no campo "A/C"; se não houver, peça ao cliente (nome completo, cargo, e-mail e telefone) ou toque em "Preencher agora".', quem: 'AMBOS', pedivel: true, campos: ['CT.NOME', 'CT.CARGO', 'CT.EMAIL', 'CT.TELEFONE'], alvo: { tipo: 'CONTATO', id: '' } });
  else if (Com_up_(ct.PAPEL) === 'INTERMEDIARIO') add({ id: 'CT.INTERMEDIARIO', grupo: 'CONTATO', oQue: 'O A/C da proposta (' + Com_s_(ct.NOME) + ') é intermediário ou indicador, não o responsável técnico do cliente',
    porque: 'O orçamento vai para quem responde tecnicamente pelo equipamento (engenharia clínica), nunca para o intermediário: ele não assina pela instituição e a proposta precisa chegar ao cliente de verdade.',
    comoResolver: 'No rascunho, escolha o responsável técnico no "A/C"; se não estiver cadastrado, peça ao cliente (nome completo, cargo, e-mail e telefone). Registre o intermediário no quadro "Intermediário e comissão".', quem: 'AMBOS', pedivel: true,
    campos: ['CT.NOME', 'CT.CARGO', 'CT.EMAIL', 'CT.TELEFONE'], alvo: { tipo: 'CONTATO', id: Com_s_(ct.ID), intermediario: true } });
  else {
    var fc = [];
    if (Com_s_(ct.NOME).split(/\s+/).filter(function (x) { return x.length > 1; }).length < 2) fc.push('NOME');
    if (!Com_s_(ct.CARGO)) fc.push('CARGO');
    if (!ComDE_emailOk_(ct.EMAIL)) fc.push('EMAIL');
    if (!ComDE_telOk_(ct.CELULAR) && !ComDE_telOk_(ct.TELEFONE)) fc.push('TELEFONE');
    if (fc.length) add({ id: 'CT.DADOS', grupo: 'CONTATO', oQue: 'O contato ' + Com_s_(ct.NOME) + ' está sem ' + fc.map(function (k) { return k === 'EMAIL' ? (Com_s_(ct.EMAIL) ? 'e-mail válido' : 'e-mail') : k === 'NOME' ? 'o nome completo (nome e sobrenome)' : k === 'CARGO' ? 'o cargo' : 'telefone com DDD'; }).join(', '),
      porque: porqueCt, comoResolver: 'Peça ao cliente ou toque em "Preencher agora".', quem: 'AMBOS', pedivel: true, campos: fc.map(function (k) { return 'CT.' + k; }), alvo: { tipo: 'CONTATO', id: Com_s_(ct.ID) } });
  }
  // contato repetido no cliente (mesmo nome): o A/C sem e-mail quando o outro tem é a troca que aconteceu no caso RIO MED
  if (ct) {
    var nomeCt = Com_normBusca_(ct.NOME), irmaos = ComDE_lerSeguro_(COM_ABAS.CONTATOS).filter(function (x) { return Com_s_(x.ID) !== Com_s_(ct.ID) && Com_s_(x.CLIENTE_ID) === Com_s_(ct.CLIENTE_ID) && Com_up_(x.STATUS || 'ATIVO') === 'ATIVO' && nomeCt && (Com_normBusca_(x.NOME) === nomeCt || Com_normBusca_(x.NOME).indexOf(nomeCt + ' ') === 0 || nomeCt.indexOf(Com_normBusca_(x.NOME) + ' ') === 0); });
    if (irmaos.length) add({ id: 'CT.REPETIDO', grupo: 'CONTATO', oQue: 'Há ' + Com_plural_(irmaos.length, 'outro contato', 'outros contatos') + ' com o nome parecido de ' + Com_s_(ct.NOME) + ' neste cliente (' + irmaos.slice(0, 3).map(function (x) { return Com_s_(x.NOME) + (Com_s_(x.EMAIL) ? ', ' + Com_s_(x.EMAIL) : ', sem e-mail'); }).join('; ') + ')',
      porque: 'Contato repetido faz a proposta ir para o cadastro errado (o que está sem e-mail, por exemplo).', comoResolver: 'Confira qual é o certo e escolha-o no "A/C" do rascunho; inative o repetido em Comercial > Clientes e contatos (o histórico fica).', quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'CONTATO_REPETIDO', id: Com_s_(ct.ID) } });
  }
  // unidade de execução: onde fica o equipamento (pode ser diferente da sede de faturamento)
  if (!un && itens.some(ComDE_exigeEquipamento_)) add({ id: 'UN.FALTA', grupo: 'UNIDADE', oQue: 'A proposta não tem a unidade de execução (onde ficam os equipamentos)',
    porque: 'A unidade diz onde o serviço é feito (pode ser outro hospital, atendido pela empresa contratante): é o destino da viagem, o local dos equipamentos e o endereço no certificado.',
    comoResolver: 'Escolha a unidade no quadro ("Usar esta unidade"); se ela não existe, cadastre em Cadastros > Unidades (com cidade e UF) e volte aqui.', quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'UNIDADE_ESCOLHER' } });
  // intermediário: a comissão precisa da Diretoria
  var inter = Com_json_(p.INTERMEDIARIO_JSON, null);
  if (inter && Com_s_(inter.nome) && !ComDE_intermediarioAprovado_(inter)) add({ id: 'INT.APROVACAO', grupo: 'INTERMEDIARIO', oQue: 'Comissão de intermediação de ' + Com_s_(inter.nome) + ' aguardando a decisão da Diretoria' + (inter.comissao !== null && inter.comissao !== undefined && inter.comissao !== '' ? ' (pedido: ' + (inter.comissaoTipo === 'VALOR' ? Com_moeda_(inter.comissao) : String(inter.comissao).replace('.', ',') + '% dos serviços e produtos') + ')' : ' (valor a definir)'),
    porque: 'A comissão de intermediação sai da sobra da empresa e não há percentual padrão: quem define é a Diretoria. Ela nunca aparece no documento do cliente.', comoResolver: 'A Diretoria abre a proposta e toca em "Decidir a comissão" (define o valor ou nega). Você é avisado.', quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'INTERMEDIARIO' } });
  // 11/11/2026 (proposta guiada): serviço pedido ao cadastro pela equipe comercial, com o preço esperando a gestão: a proposta espera
  var catDE = {}; ComDE_lerSeguro_(COM_ABAS.PRODUTOS).forEach(function (x) { catDE[Com_s_(x.ID)] = x; });
  itens.forEach(function (i, k) {
    var pr = Com_s_(i.produtoId) ? catDE[Com_s_(i.produtoId)] : null;
    if (pr && typeof ComP_precoNaoAprovado_ === 'function' && ComP_precoNaoAprovado_(pr)) add({ id: 'SRV.PENDENTE.' + Com_s_(pr.ID), grupo: 'ESCOPO', oQue: 'O item ' + (Number(i.ordem) || k + 1) + ' (' + Com_s_(pr.CODIGO) + ', ' + Com_s_(pr.NOME).slice(0, 60) + ') é um serviço pedido ao cadastro e espera a gestão comercial aprovar o cadastro e o preço',
      porque: 'Serviço novo no catálogo é conferido pela gestão (descrição, preço e custo) antes de ir ao cliente.', comoResolver: 'Aguarde a decisão na Caixa de decisões (você é avisado) ou peça à gestão comercial. Se o serviço já existir com outro nome, troque o item no rascunho.',
      quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'ITEM', item: Number(i.ordem) || k + 1 } });
  });
  // 4. equipamentos dos serviços técnicos
  var eqs = {};
  ComDE_lerSeguro_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { eqs[Com_s_(e.ID)] = e; });
  var porqueEq = 'O preço, o plano de ensaio, os padrões e o relatório dependem do equipamento; sem ele identificado, a execução vira discussão e o certificado sai com dado errado.';
  itens.forEach(function (i, k) {
    if (!ComDE_exigeEquipamento_(i)) return;
    var ordem = Number(i.ordem) || k + 1, nome = 'Item ' + ordem + ' (' + Com_s_(i.descricao).slice(0, 60) + ')';
    var precisa = ComDE_qtdEquipamentos_(i), ids = ComDE_identificados_(i, eqs, Com_s_(i.descricao));
    ids.forEach(function (e) {
      if (!e.faltam.length) return;
      if (e.origem === 'CADASTRO') {
        add({ id: 'EQC.' + e.equipamentoId, grupo: 'EQUIPAMENTO', oQue: nome + ': o equipamento do cadastro (' + e.texto + ') está ' + (e.inexistente ? 'apagado ou juntado em outro' : 'sem ' + e.faltam.map(function (x) { return COM_DE_CAMPOS.EQC[x].r.toLowerCase(); }).join(', ')),
          porque: porqueEq, comoResolver: e.inexistente ? 'No rascunho, escolha outro equipamento para o item.' : 'Peça ao cliente os dados que faltam ou toque em "Preencher agora" (só os campos em branco do cadastro são preenchidos).',
          quem: e.inexistente ? 'INTERNO' : 'AMBOS', pedivel: !e.inexistente, campos: e.inexistente ? [] : e.faltam.map(function (x) { return 'EQC.' + e.equipamentoId + '.' + x; }), alvo: { tipo: 'EQUIPAMENTO_CADASTRO', id: e.equipamentoId, item: ordem } });
      } else {
        add({ id: 'EQI.' + ordem + '.' + Com_marca_(e.texto).slice(0, 8), grupo: 'EQUIPAMENTO', oQue: nome + ': o equipamento informado (' + (e.texto || 'sem identificação') + ') está sem ' + e.faltam.map(function (x) { return COM_DE_CAMPOS.EQ[x].r.toLowerCase(); }).join(', '),
          porque: porqueEq, comoResolver: 'No rascunho, toque em "Identificar equipamentos" no item e complete; ou peça ao cliente.', quem: 'AMBOS', pedivel: false, campos: [], alvo: { tipo: 'ITEM', item: ordem } });
      }
    });
    var faltamN = precisa - ids.length;
    if (faltamN > 0) {
      var campos = [];
      for (var s = ids.length + 1; s <= precisa; s++) {
        ['TIPO', 'MARCA', 'MODELO', 'SERIE', 'SETOR'].forEach(function (x) { campos.push('EQ.' + ordem + '.' + s + '.' + x); });
        if (ComDE_exigeCapacidade_(i.descricao)) campos.push('EQ.' + ordem + '.' + s + '.CAPACIDADE');
      }
      add({ id: 'EQ.' + ordem, grupo: 'EQUIPAMENTO', oQue: nome + ': ' + (precisa === 1 ? 'equipamento não identificado' : (ids.length ? 'faltam ' + faltamN + ' de ' + precisa + ' equipamentos' : 'os ' + precisa + ' equipamentos não estão identificados')),
        porque: porqueEq + (precisa > 1 ? ' A quantidade ' + precisa + ' quer dizer ' + precisa + ' equipamentos: cada um precisa estar identificado.' : ''),
        comoResolver: 'Escolha do cadastro de equipamentos do cliente ou informe tipo, marca, modelo, número de série, setor' + (ComDE_exigeCapacidade_(i.descricao) ? ' e capacidade' : '') + ' (no rascunho, "Identificar equipamentos" no item); se só o cliente sabe, toque em "Pedir ao cliente".',
        quem: 'AMBOS', pedivel: true, campos: campos, alvo: { tipo: 'ITEM', item: ordem, descricao: Com_s_(i.descricao).slice(0, 120), precisa: precisa, tem: ids.length } });
    }
  });
  // 5. escopo e descrição. 11/11/2026 (dono: "um especialista I.A preenche impecavelmente e o vendedor só lê e valida"): proposta com
  // serviço precisa do escopo escrito (pela especialista ou pelo vendedor) e LIDO E VALIDADO pelo vendedor; mudou item, equipamento ou
  // o texto depois da validação, a validação cai (ComDE_escopoValidado_).
  var escopo = typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO);
  var servicos = itens.filter(function (i) { return Com_up_(i.tipo) !== 'PRODUTO'; });
  var porqueEsc = 'O escopo é o que o cliente compra e o que a técnica executa (o que é feito em cada equipamento, normas, entregáveis e o que não está incluso); genérico ou não lido, cada lado entende uma coisa.';
  if (servicos.length) {
    if (!Com_s_(escopo) || ComDE_generico_(escopo, 60)) add({ id: 'ESC.VAZIO', grupo: 'ESCOPO', oQue: Com_s_(escopo) ? 'A descrição (escopo) da proposta é genérica ("' + Com_s_(escopo).slice(0, 60) + '")' : 'A proposta está sem escopo (o documento sairia "Conforme os itens da tabela")',
      porque: porqueEsc, comoResolver: 'No rascunho, depois de identificar os equipamentos, toque em "Gerar o escopo com a especialista": o texto vem pronto a partir do catálogo, dos equipamentos e das condições; leia, ajuste se precisar e toque em "Li e valido o escopo".',
      quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'ESCOPO' } });
    else { var ev = ComDE_escopoValidado_(p); if (!ev.valido) add({ id: 'ESC.VALIDACAO', grupo: 'ESCOPO', oQue: ev.motivo,
      porque: porqueEsc, comoResolver: 'Leia o escopo no quadro "Escopo da proposta" e toque em "Li e valido o escopo" (fica registrado quem validou e quando). Se os itens mudaram, gere de novo com a especialista antes de validar.',
      quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'ESCOPO' } }); }
  }
  itens.forEach(function (i, k) {
    if (ComDE_generico_(i.descricao, 6)) add({ id: 'ESC.ITEM.' + (Number(i.ordem) || k + 1), grupo: 'ESCOPO', oQue: 'O item ' + (Number(i.ordem) || k + 1) + ' tem descrição genérica ("' + Com_s_(i.descricao).slice(0, 40) + '")',
      porque: 'A descrição do item sai no documento e na nota; genérica, ninguém sabe o que foi vendido.', comoResolver: 'No rascunho, escolha o item do catálogo ou escreva o que é fornecido.', quem: 'INTERNO', pedivel: false, campos: [], alvo: { tipo: 'ITEM', item: Number(i.ordem) || k + 1 } });
  });
  return faltas;
}

/** Sem o módulo de cadastros (teste isolado): só o básico. */
function ComDE_problemasClienteBasico_(c) {
  var p = [], pb = function (codigo, campos, texto) { p.push({ codigo: codigo, campos: campos, texto: texto }); };
  if (!ComDE_dig_(c.CNPJ) && !ComDE_dig_(c.CPF)) pb('DOC_FALTA', ['CNPJ'], 'Sem CNPJ nem CPF');
  else if (ComDE_dig_(c.CNPJ) && !ComDE_cnpjOk_(c.CNPJ)) pb('CNPJ_INVALIDO', ['CNPJ'], 'CNPJ inválido (os dígitos verificadores não conferem)');
  if (!Com_s_(c.RAZAO_SOCIAL)) pb('RAZAO_FALTA', ['RAZAO_SOCIAL'], 'Sem razão social');
  var fe = [];
  if (ComDE_dig_(c.CEP).length !== 8) fe.push('CEP');
  ['LOGRADOURO', 'NUMERO', 'BAIRRO', 'CIDADE'].forEach(function (k) { if (!Com_s_(c[k])) fe.push(k); });
  if (COM_DE_UFS.indexOf(Com_up_(c.UF)) < 0) fe.push('UF');
  if (fe.length) pb('ENDERECO_INCOMPLETO', fe, 'Endereço incompleto');
  if (!Com_s_(c.CONTATO)) pb('CONTATO_FALTA', ['CONTATO'], 'Sem o nome do contato responsável');
  if (!ComDE_emailOk_(c.EMAIL)) pb('EMAIL_FALTA', ['EMAIL'], 'Contato sem e-mail');
  if (!ComDE_telOk_(c.TELEFONE)) pb('TELEFONE_FALTA', ['TELEFONE'], 'Contato sem telefone');
  return p;
}

/** Liberação registrada que cobre todas as faltas de agora (mesma proposta). */
function ComDE_liberacaoCobre_(p, faltas) {
  var lib = Com_json_(p.DADOS_LIBERACAO_JSON, null);
  if (!lib || !Array.isArray(lib.ids)) return null;
  var fora = faltas.filter(function (f) { return lib.ids.indexOf(f.id) < 0; });
  return fora.length ? null : lib;
}

/** Resumo para a tela da proposta. */
function ComDE_paraTela_(eu, p) {
  var s = Com_up_(p.SITUACAO), cfg = ComDE_cfg_();
  var faltas = ComDE_faltas_(p), lib = Com_json_(p.DADOS_LIBERACAO_JSON, null), cobre = ComDE_liberacaoCobre_(p, faltas);
  var pedido = Com_json_(p.DADOS_PEDIDO_JSON, null);
  var meu = eu.gestao || Com_s_(p.RESPONSAVEL_ID) === eu.id;
  var ativa = ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(s) >= 0;
  var r = { ligada: cfg.ligada, total: faltas.length, faltas: faltas.map(function (f) { return { id: f.id, grupo: f.grupo, grupoNome: COM_DE_GRUPOS[f.grupo] || f.grupo, oQue: f.oQue, porque: f.porque, comoResolver: f.comoResolver, quem: f.quem, pedivel: f.pedivel, campos: f.campos, alvo: f.alvo }; }),
    emitidaAntes: !!Com_s_(p.GERADA_EM) && !Com_s_(Com_json_(p.CONGELADO_JSON, {}).dadosConferidosEm), ativa: ativa,
    podePedir: meu && ativa && faltas.some(function (f) { return f.pedivel; }), podePreencher: meu && ativa,
    podeLiberar: ativa && faltas.length > 0 && ComDE_podeLiberar_(eu), liberacao: lib ? { em: Com_br_(lib.em), por: Com_s_(lib.porNome), motivo: Com_s_(lib.motivo), cobre: !!cobre, qtd: (lib.ids || []).length } : null };
  if (pedido) r.pedido = ComDE_pedidoTela_(pedido, true);
  if (r.pedido && pedido.resposta && pedido.situacao === 'RESPONDIDO') r.pedido.resposta = ComDE_respostaTela_(p, pedido);
  r.campos = ComDE_definicoes_(faltas.filter(function (f) { return f.pedivel; }), p, true);
  r.escopo = ComDE_escopoTela_(p);
  // 11/11/2026: unidades do cliente (unidade de execução) e o intermediário com a decisão da Diretoria
  r.unidadesCliente = ComDE_lerSeguro_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Com_s_(u.CLIENTE_ID) === Com_s_(p.CLIENTE_ID) && Com_up_(u.STATUS || 'ATIVO') === 'ATIVO'; })
    .map(function (u) { return { id: Com_s_(u.ID), nome: Com_s_(u.NOME_UNIDADE) + (Com_s_(u.CIDADE) ? ' (' + Com_s_(u.CIDADE) + '/' + Com_s_(u.UF) + ')' : ' (sem cidade)') }; });
  var it = Com_json_(p.INTERMEDIARIO_JSON, null);
  r.intermediario = it && Com_s_(it.nome) ? { nome: Com_s_(it.nome), tipo: it.tipo, comissaoTipo: it.comissaoTipo, comissao: it.comissao, motivo: Com_s_(it.motivo), por: Com_s_(it.porNome), em: Com_br_(it.em),
    aprovado: ComDE_intermediarioAprovado_(it), decisao: it.aprovacao ? { decisao: it.aprovacao.decisao, por: Com_s_(it.aprovacao.porNome), em: Com_br_(it.aprovacao.em), texto: Com_s_(it.aprovacao.texto), comissaoTipo: it.aprovacao.comissaoTipo, comissao: it.aprovacao.comissao } : null } : null;
  r.podeDecidirComissao = !!r.intermediario && ComDE_podeLiberar_(eu);
  r.contatosIntermediarios = ComDE_lerSeguro_(COM_ABAS.CONTATOS).filter(function (c) { return Com_s_(c.CLIENTE_ID) === Com_s_(p.CLIENTE_ID) && Com_up_(c.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (c) { return { id: Com_s_(c.ID), nome: Com_s_(c.NOME), papel: Com_up_(c.PAPEL) }; });
  r.podeGerarEscopo = meu && s === 'RASCUNHO';
  r.podeValidarEscopo = meu && ativa;
  return r;
}
function ComDE_pedidoTela_(pd, interno) {
  var o = { situacao: Com_s_(pd.situacao), situacaoNome: COM_DE_SITUACOES[pd.situacao] || (pd.situacao === 'CONFERIDO' ? 'Dados conferidos' : pd.situacao === 'CANCELADO' ? 'Pedido cancelado' : ''), em: Com_br_(pd.em), por: Com_s_(pd.porNome),
    validoAte: Com_brDia_(pd.validoAte), vencido: !!pd.validoAte && Com_dia_(pd.validoAte) < Com_hoje_(), qtdCampos: (pd.campos || []).length, itens: (pd.lista || []).slice(0, 60),
    respondidoEm: pd.resposta ? Com_br_(pd.resposta.em) : '', respondidoPor: pd.resposta ? Com_s_(pd.resposta.nome) : '', conferidoEm: Com_br_(pd.conferidoEm), conferidoPor: Com_s_(pd.conferidoPorNome) };
  if (interno) { o.textos = pd.textos || null; o.url = Com_s_(pd.url); o.emailEnviadoPara = Com_s_(pd.emailEnviadoPara); }
  return o;
}

// ------------------------------------------------------------
// TRAVA DA EMISSÃO
// ------------------------------------------------------------
/** Confere antes de emitir (gerar o documento). Lança no padrão do operador. Devolve { faltas, liberacao } quando pode. */
function ComDE_exigirParaEmitir_(p, acao) {
  var cfg = ComDE_cfg_();
  var faltas = ComDE_faltas_(p);
  if (!faltas.length) return { faltas: [], liberacao: null };
  var cobre = ComDE_liberacaoCobre_(p, faltas);
  if (cobre) return { faltas: faltas, liberacao: cobre };
  if (!cfg.ligada) return { faltas: faltas, liberacao: null, desligada: true };
  var pedido = Com_json_(p.DADOS_PEDIDO_JSON, null), pedivel = faltas.some(function (f) { return f.pedivel; });
  var lista = faltas.slice(0, 8).map(function (f, k) { return (k + 1) + ') ' + f.oQue; }).join('; ') + (faltas.length > 8 ? '; e mais ' + (faltas.length - 8) : '');
  throw new Error('Não foi possível ' + acao + ': ' + (faltas.length === 1 ? 'falta 1 dado' : 'faltam ' + faltas.length + ' dados') + ' para emitir a proposta ' + ComP_rotulo_(p) + ': ' + lista +
    '. Por quê: a proposta só vai ao cliente com os dados completos (cadastro de faturamento, contato, equipamento de cada serviço e escopo); faltando, a nota, o certificado e a execução saem errados. ' +
    'O que fazer: no quadro "Faltam dados para emitir" da proposta, toque em "Preencher agora" no que você já tem do cliente' + (pedivel ? ' e em "Pedir ao cliente" para o resto (o cliente recebe a lista exata e um link seguro; você confere antes de entrar no cadastro)' : '') +
    (pedido && pedido.situacao === 'AGUARDANDO_CLIENTE' ? '. Já há um pedido enviado ao cliente em ' + Com_br_(pedido.em) + ', aguardando a resposta' : pedido && pedido.situacao === 'RESPONDIDO' ? '. O cliente já respondeu: toque em "Conferir os dados do cliente"' : '') +
    '. Caso excepcional (urgência, licitação): só a Diretoria libera a emissão, com o motivo registrado. Nada foi gerado');
}

/** Depois de gerar: marca no congelado e no histórico (com a liberação, se houve). */
function ComDE_aoEmitir_(p, cong, conf, eu) {
  try {
    cong.dadosConferidosEm = Com_agora_();
    if (conf && conf.liberacao) {
      cong.dadosLiberacao = { em: conf.liberacao.em, porNome: conf.liberacao.porNome, motivo: conf.liberacao.motivo, faltas: conf.faltas.map(function (f) { return f.oQue; }).slice(0, 40) };
      Com_historico_('PROPOSTA', p.ID, 'DADOS_LIBERACAO_USADA', eu, { texto: 'Documento gerado com ' + Com_plural_(conf.faltas.length, 'dado faltando', 'dados faltando') + ', pela liberação excepcional de ' + Com_s_(conf.liberacao.porNome) + ' (' + Com_br_(conf.liberacao.em) + '): ' + Com_s_(conf.liberacao.motivo) });
    } else if (conf && conf.desligada && conf.faltas.length) {
      cong.dadosFaltando = conf.faltas.map(function (f) { return f.oQue; }).slice(0, 40);
      Com_historico_('PROPOSTA', p.ID, 'DADOS_TRAVA_DESLIGADA', eu, { texto: 'Documento gerado com a conferência de dados desligada (' + COM_DE_PROP_CFG + '): ' + cong.dadosFaltando.join('; ') });
    }
  } catch (e) { console.error('Comercial, dados para emitir: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// LIBERAÇÃO EXCEPCIONAL (Diretoria, Administrador ou dono)
// ------------------------------------------------------------
function ComDE_podeLiberar_(eu) { return !!eu && (eu.diretoria || eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || Com_ehDono_(eu.login)); }
function ComDE_obter_(eu, id, acao) {
  Com_exigir_(eu, 'VENDEDOR', acao);
  var p = ComP_obter_(eu, id, acao);
  if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Não foi possível ' + acao + ': a proposta é de ' + (Com_s_(p.RESPONSAVEL_NOME) || 'outra pessoa'));
  return p;
}

/** d: { id, motivo } */
function ComDE_liberar_(eu, d) {
  d = d || {};
  if (!ComDE_podeLiberar_(eu)) throw new Error('Não foi possível liberar: a emissão com dados faltando é exceção e só a Diretoria, o Administrador ou o dono liberam. Peça pelo botão "Pedir liberação à Diretoria", com o motivo');
  var motivo = Com_texto_(d.motivo, 1000);
  if (motivo.length < 20) throw new Error('Não foi possível liberar: escreva o motivo da exceção (pelo menos 20 letras), por exemplo "Licitação por lote: o hospital informa os equipamentos depois da homologação". O motivo fica no histórico da proposta');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComP_obter_(eu, d.id, 'liberar a emissão');
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) throw new Error('Não foi possível liberar: a proposta ' + ComP_rotulo_(p) + ' está "' + (COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || p.SITUACAO) + '". A liberação vale para a proposta antes do documento');
    var faltas = ComDE_faltas_(p);
    if (!faltas.length) throw new Error('Não foi possível liberar: a proposta ' + ComP_rotulo_(p) + ' já tem todos os dados para emitir. Nada a liberar');
    var lib = { em: Com_agora_(), porId: eu.id, porNome: eu.nome, motivo: motivo, ids: faltas.map(function (f) { return f.id; }), faltas: faltas.map(function (f) { return f.oQue; }).slice(0, 40) };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { DADOS_LIBERACAO_JSON: JSON.stringify(lib), ATUALIZADO_EM: lib.em });
    Com_historico_('PROPOSTA', p.ID, 'DADOS_LIBERACAO', eu, { texto: 'Emissão liberada com ' + Com_plural_(faltas.length, 'dado faltando', 'dados faltando') + ' (' + lib.faltas.slice(0, 10).join('; ') + '). Motivo: ' + motivo + '. Vale só para estas faltas nesta revisão.' });
    if (Com_s_(p.RESPONSAVEL_ID) && Com_s_(p.RESPONSAVEL_ID) !== eu.id) Com_avisar_(Com_s_(p.RESPONSAVEL_ID), 'DADOS_LIBERACAO', 'Emissão liberada pela Diretoria: ' + ComP_rotulo_(p), Com_s_(p.CLIENTE_NOME) + ': ' + eu.nome + ' liberou a emissão com dados faltando. Motivo: ' + motivo + '. Gere o documento; os dados que faltam continuam a ser pedidos ao cliente.', { tipo: 'proposta', id: p.ID }, { email: true });
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Emissão liberada para as ' + faltas.length + ' faltas de agora. O motivo ficou no histórico; falta nova ou nova revisão precisa de nova liberação.' };
  });
}

/** Vendedor pede a liberação: aviso à Diretoria (sistema na hora; e-mail no expediente). d: { id, motivo } */
function ComDE_pedirLiberacao_(eu, d) {
  d = d || {};
  var motivo = Com_texto_(d.motivo, 1000);
  if (motivo.length < 20) throw new Error('Não foi possível pedir a liberação: escreva por que a proposta precisa sair antes dos dados completos (pelo menos 20 letras). A Diretoria decide com esse motivo');
  var p = ComDE_obter_(eu, d && d.id, 'pedir a liberação');
  var faltas = ComDE_faltas_(p);
  if (!faltas.length) throw new Error('Não foi possível pedir: a proposta já tem todos os dados para emitir');
  var us = Com_usuarios_(), ids = Object.keys(us).filter(function (id) { return us[id].ativo && (us[id].perfil === 'DIRETORIA' || Com_ehDono_(us[id].login)) && id !== eu.id; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'ADMIN' && id !== eu.id; });
  ids.forEach(function (id) { Com_avisar_(id, 'DADOS_LIBERACAO_PEDIDO', 'Liberar a emissão com dados faltando: ' + ComP_rotulo_(p), Com_s_(p.CLIENTE_NOME) + ': ' + eu.nome + ' pede a emissão antes dos dados completos. Faltam: ' + faltas.slice(0, 6).map(function (f) { return f.oQue; }).join('; ') + '. Motivo: ' + motivo + '. Abra a proposta em Comercial > Propostas e toque em "Liberar a emissão" ou deixe como está.', { tipo: 'proposta', id: p.ID }, { email: true }); });
  Com_historico_('PROPOSTA', p.ID, 'DADOS_LIBERACAO_PEDIDA', eu, { texto: 'Pedido de liberação da emissão à Diretoria: ' + motivo });
  return { message: 'Pedido enviado à Diretoria (' + ids.length + (ids.length === 1 ? ' pessoa' : ' pessoas') + '). Enquanto isso, continue pedindo os dados ao cliente.' };
}

// ------------------------------------------------------------
// DEFINIÇÃO DOS CAMPOS PEDIDOS (tela interna e página do cliente)
// ------------------------------------------------------------
/** [{ chave, grupo, titulo, rotulo, tipo, opcional, valor (só interno) }] a partir das faltas pedíveis. */
function ComDE_definicoes_(faltas, p, interno) {
  var out = [], visto = {};
  var itens = Com_json_(p.ITENS_JSON, []) || [];
  var eqs = null;
  (faltas || []).forEach(function (f) {
    (f.campos || []).forEach(function (ch) {
      if (visto[ch]) return; visto[ch] = 1;
      var parte = ch.split('.'), pre = parte[0], campo = parte[parte.length - 1], def = (COM_DE_CAMPOS[pre] || {})[campo];
      if (!def) return;
      var o = { chave: ch, grupo: f.grupo, grupoNome: COM_DE_GRUPOS[f.grupo], rotulo: def.r, tipo: def.t, opcional: !!def.opcional, titulo: COM_DE_GRUPOS[f.grupo] };
      if (pre === 'EQ') {
        var it = itens.filter(function (x) { return Number(x.ordem) === Number(parte[1]); })[0] || {};
        o.titulo = 'Item ' + parte[1] + ' · ' + Com_s_(it.descricao).slice(0, 80) + (ComDE_qtdEquipamentos_(it) > 1 ? ' · equipamento ' + parte[2] + ' de ' + ComDE_qtdEquipamentos_(it) : '');
        o.bloco = 'EQ.' + parte[1] + '.' + parte[2];
        if (campo === 'TIPO' && !interno) o.sugestao = '';
      } else if (pre === 'EQC') {
        if (!eqs) { eqs = {}; ComDE_lerSeguro_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { eqs[Com_s_(e.ID)] = e; }); }
        var c = eqs[parte[1]] || {};
        o.titulo = 'Item ' + (f.alvo && f.alvo.item) + ' · ' + ([Com_s_(c.TIPO), Com_s_(c.TAG) ? 'TAG ' + Com_s_(c.TAG) : '', Com_s_(c.MODELO)].filter(Boolean).join(' · ') || 'equipamento');
        o.bloco = 'EQC.' + parte[1];
      } else o.bloco = pre;
      out.push(o);
    });
  });
  return out;
}

/** Confere e normaliza um valor. { ok, valor, erro } (vazio = ok, valor ''). */
function ComDE_validar_(chave, valor) {
  var parte = Com_s_(chave).split('.'), pre = parte[0], campo = parte[parte.length - 1], def = (COM_DE_CAMPOS[pre] || {})[campo];
  if (!def) return { ok: false, erro: 'campo desconhecido' };
  var v = Com_texto_(valor, 200).replace(/\s+/g, ' ').trim();
  if (!v) return { ok: true, valor: '' };
  if (def.t === 'doc') {
    var d = ComDE_dig_(v);
    if (d.length === 14) { if (!ComDE_cnpjOk_(d)) return { ok: false, erro: 'CNPJ inválido: os dígitos verificadores não conferem. Confira os 14 números' }; return { ok: true, valor: d, doc: 'CNPJ' }; }
    if (d.length === 11) { if (!ComDE_cpfOk_(d)) return { ok: false, erro: 'CPF inválido: os dígitos verificadores não conferem. Confira os 11 números' }; return { ok: true, valor: d, doc: 'CPF' }; }
    return { ok: false, erro: 'Informe o CNPJ (14 números) ou o CPF (11 números)' };
  }
  if (def.t === 'cep') { var c = ComDE_dig_(v); if (c.length !== 8) return { ok: false, erro: 'O CEP tem 8 números (ex.: 74000-000)' }; return { ok: true, valor: c.slice(0, 5) + '-' + c.slice(5) }; }
  if (def.t === 'uf') { var u = Com_up_(v); if (COM_DE_UFS.indexOf(u) < 0) return { ok: false, erro: 'Escolha a UF (sigla do estado, ex.: GO)' }; return { ok: true, valor: u }; }
  if (def.t === 'email') { var e = v.toLowerCase(); if (!ComDE_emailOk_(e)) return { ok: false, erro: 'E-mail incompleto ou inválido (ex.: financeiro@hospital.com.br)' }; return { ok: true, valor: e }; }
  if (def.t === 'tel') { if (!ComDE_telOk_(v)) return { ok: false, erro: 'Telefone com DDD: 10 ou 11 números (ex.: 62 99999-0000)' }; var t = ComDE_dig_(v); if (t.length > 11) t = t.slice(2); return { ok: true, valor: t }; }
  if (v.length < 2) return { ok: false, erro: 'Escreva o dado completo' };
  return { ok: true, valor: v.slice(0, 160) };
}

// ------------------------------------------------------------
// PEDIR AO CLIENTE
// ------------------------------------------------------------
function ComDE_token_() {
  if (typeof AstL_novoToken_ === 'function') return AstL_novoToken_();
  return Com_marca_([Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Date.now()].join('|'));
}
function ComDE_resumoToken_(token) { return Com_marca_('COM-DADOS-LINK|' + Com_s_(token)); }
function ComDE_url_(token) {
  var base = '';
  try { base = String(ScriptApp.getService().getUrl() || ''); } catch (e) { base = ''; }
  base = base.replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (!/^https?:\/\/[^\/]+/i.test(base)) throw new Error('Não foi possível gerar o link: o endereço público do SGO+ não está configurado neste servidor. Avise o administrador; enquanto isso, use o texto sem o link e registre os dados com "Preencher agora"');
  return base.replace(/^(https?:\/\/[^\/]+).*$/i, '$1') + '/dados-cliente/#' + token;
}

/** Textos prontos (e-mail e WhatsApp) com a lista exata. */
function ComDE_textos_(p, lista, url, validoAte) {
  var v = typeof ComP_vendedor_ === 'function' ? ComP_vendedor_(p) : { nome: Com_s_(p.RESPONSAVEL_NOME), email: '', telefone: '' };
  var ct = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) : null;
  var nome = ct && Com_s_(ct.NOME) ? (typeof ComP_nomeBonito_ === 'function' ? ComP_nomeBonito_(ct.NOME) : Com_s_(ct.NOME)) : '';
  var rot = ComP_rotulo_(p), NL = String.fromCharCode(10);
  var linhas = lista.map(function (x, k) { return (k + 1) + '. ' + x; });
  var assunto = 'Dados para a proposta ' + rot + ' | Metrolabs';
  var email = (nome ? 'Prezado(a) ' + nome + ',' : 'Prezados(as),') + NL + NL +
    'Para emitirmos a proposta comercial ' + rot + (Com_s_(p.TITULO) ? ' (' + Com_s_(p.TITULO) + ')' : '') + ' sem erros na nota fiscal, no relatório e no certificado, precisamos dos dados abaixo:' + NL + NL +
    linhas.join(NL) + NL + NL + (url ? 'O jeito mais rápido é preencher pelo link seguro, que pede só o que falta: ' + url + ' (válido até ' + Com_brDia_(validoAte) + '). Se preferir, responda este e-mail com os dados.' : 'Por favor, responda este e-mail com os dados.') + NL + NL +
    'Assim que recebermos, conferimos e emitimos a proposta.' + NL + NL + 'Atenciosamente,' + NL + Com_s_(v.nome) + NL + 'Metrolabs' + (v.telefone ? NL + v.telefone : '') + (v.email ? NL + v.email : '');
  var whats = (nome ? 'Olá, ' + nome.split(' ')[0] + '! ' : 'Olá! ') + 'Aqui é ' + Com_s_(v.nome).split(' ')[0] + ', da Metrolabs. Para emitir a proposta ' + rot + ' sem erro na nota e no certificado, preciso destes dados:' + NL +
    linhas.slice(0, 15).join(NL) + (linhas.length > 15 ? NL + '(e mais ' + (linhas.length - 15) + ')' : '') + NL + (url ? 'Pode preencher por este link seguro (só o que falta): ' + url : 'Pode me mandar por aqui mesmo.') + NL + 'Obrigado!';
  var tel = ct ? ComDE_dig_(ct.CELULAR) || ComDE_dig_(ct.TELEFONE) : '';
  return { assunto: assunto, email: email, whatsapp: whats, whatsappLink: tel.length === 11 ? 'https://wa.me/55' + tel + '?text=' + encodeURIComponent(whats) : '', emailContato: ct && ComDE_emailOk_(ct.EMAIL) ? Com_s_(ct.EMAIL).toLowerCase() : '' };
}

/** Lista legível do que falta (agrupada; os equipamentos por item). */
function ComDE_listaPedido_(faltas, defs) {
  var l = [];
  faltas.filter(function (f) { return f.pedivel; }).forEach(function (f) {
    var ds = defs.filter(function (d) { return f.campos.indexOf(d.chave) >= 0 && !d.opcional; });
    if (f.grupo === 'EQUIPAMENTO' && f.alvo && f.alvo.tipo === 'ITEM') l.push(f.oQue.replace(/^Item \d+ \(/, 'Serviço "').replace(/\): /, '": ') + ' — informe de cada um: tipo, marca, modelo, número de série, setor' + (ds.some(function (d) { return /CAPACIDADE$/.test(d.chave); }) ? ' e capacidade' : ''));
    else l.push((COM_DE_GRUPOS[f.grupo] || '') + ': ' + ds.map(function (d) { return d.rotulo.toLowerCase(); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', '));
  });
  return l;
}

/** Gera o pedido (substitui o anterior). d: { id, enviarEmail (endereço, opcional) } */
function ComDE_pedir_(eu, d) {
  d = d || {};
  var r = Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComDE_obter_(eu, d.id, 'pedir os dados ao cliente');
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) throw new Error('Não foi possível pedir os dados: a proposta ' + ComP_rotulo_(p) + ' está "' + (COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || p.SITUACAO) + '". O pedido de dados vale antes da emissão; para uma proposta já enviada, faça nova revisão');
    var faltas = ComDE_faltas_(p).filter(function (f) { return f.pedivel; });
    if (!faltas.length) throw new Error('Não foi possível pedir: nada do que falta depende do cliente (' + (ComDE_faltas_(p).map(function (f) { return f.oQue; }).join('; ') || 'a proposta está completa') + '). Resolva no rascunho');
    var defs = ComDE_definicoes_(faltas, p, false), lista = ComDE_listaPedido_(faltas, defs);
    var anterior = Com_json_(p.DADOS_PEDIDO_JSON, null), props = PropertiesService.getScriptProperties();
    var token = ComDE_token_(), hash = ComDE_resumoToken_(token), url = ComDE_url_(token), agora = Com_agora_();
    var validoAte = Com_somarDias_(Com_hoje_(), COM_DE_LINK_DIAS);
    var textos = ComDE_textos_(p, lista, url, validoAte);
    var pd = { id: hash.slice(0, 12), em: agora, porId: eu.id, porNome: eu.nome, linkHash: hash, validoAte: validoAte, situacao: 'AGUARDANDO_CLIENTE', campos: defs.map(function (x) { return x.chave; }),
      defs: defs, lista: lista, faltaIds: faltas.map(function (f) { return f.id; }), textos: textos, url: url, atividadeId: '' };
    if (anterior && anterior.linkHash) props.deleteProperty('COM_DE_LINK_' + anterior.linkHash);
    if (anterior && anterior.atividadeId && Com_atividadeAberta_(Com_atividade_(anterior.atividadeId))) Com_mudarAtividade_(anterior.atividadeId, 'Concluída', 'Substituída por um novo pedido de dados ao cliente.');
    props.setProperty('COM_DE_LINK_' + hash, Com_s_(p.ID));
    // cobrança em Minhas atividades (2 dias úteis): Minhas atividades cobra o atraso; nunca impede o pedido
    try {
      var prazo = Com_somarDiasUteis_(Com_hoje_(), 2) + 'T10:00';
      pd.atividadeId = Com_criarAtividade_({ comoPessoa: Com_s_(p.RESPONSAVEL_ID) === eu.id ? eu : null, responsavelId: Com_s_(p.RESPONSAVEL_ID), titulo: 'Cobrar os dados do cliente: ' + ComP_rotulo_(p) + ' (' + Com_texto_(p.CLIENTE_NOME, 60) + ')',
        descricao: 'Pedido de dados enviado em ' + Com_br_(agora) + '. Faltam:' + String.fromCharCode(10) + lista.map(function (x) { return '- ' + x; }).join(String.fromCharCode(10)) + String.fromCharCode(10) + 'Quando o cliente responder pelo link, a proposta avisa e você confere os dados.',
        prazo: prazo, clienteId: Com_s_(p.CLIENTE_ID), unidadeId: Com_s_(p.UNIDADE_ID), porQue: 'Regra do Comercial (11/11/2026): a proposta só é emitida com os dados completos. Sem os dados do cliente, ela não sai.',
        onde: 'Comercial > Propostas > ' + ComP_rotulo_(p), como: 'Ligue ou mande mensagem ao contato lembrando do link (o texto está na proposta, "Copiar texto").', restrita: true });
    } catch (eA) { pd.atividadeErro = String((eA && eA.message) || eA).slice(0, 200); }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { DADOS_PEDIDO_JSON: JSON.stringify(pd), DADOS_SITUACAO: 'AGUARDANDO_CLIENTE', ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'DADOS_PEDIDO', eu, { para: COM_DE_SITUACOES.AGUARDANDO_CLIENTE, texto: 'Pedido de dados ao cliente (' + Com_plural_(defs.length, 'campo', 'campos') + '; link válido até ' + Com_brDia_(validoAte) + '): ' + lista.join('; ') + '.' + (anterior && anterior.linkHash && anterior.situacao === 'AGUARDANDO_CLIENTE' ? ' O link do pedido anterior (' + Com_br_(anterior.em) + ') foi cancelado.' : '') });
    return { p: p, pd: pd };
  });
  var p = r.p, pd = r.pd, enviado = '';
  var para = Com_s_(d.enviarEmail).toLowerCase();
  if (para) {
    if (!ComDE_emailOk_(para)) throw new Error('O pedido foi criado, mas o e-mail não saiu: o endereço "' + para + '" não é válido. Copie o texto e envie você mesmo, ou toque em "Enviar por e-mail" de novo com o endereço certo');
    var v = typeof ComP_vendedor_ === 'function' ? ComP_vendedor_(p) : { nome: eu.nome, email: eu.email };
    var msg = { to: para, subject: pd.textos.assunto, body: pd.textos.email, name: Com_s_(v.nome) + ' — Metrolabs' };
    if (v.email) { msg.replyTo = v.email; if (v.email !== para) msg.bcc = v.email; }
    try { MailApp.sendEmail(msg); enviado = para; } catch (eM) { throw new Error('O pedido foi criado e o link vale, mas o e-mail não saiu (' + String((eM && eM.message) || eM).slice(0, 160) + '). Copie o texto e envie pelo seu e-mail ou WhatsApp'); }
    Com_comTrava_(function () {
      var at = SGO_DATA.getById(COM_ABAS.PROPOSTAS, p.ID), pj = Com_json_(at.DADOS_PEDIDO_JSON, null);
      if (pj && pj.linkHash === pd.linkHash) { pj.emailEnviadoPara = para; pj.emailEnviadoEm = Com_agora_(); SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { DADOS_PEDIDO_JSON: JSON.stringify(pj) }); }
      Com_historico_('PROPOSTA', p.ID, 'DADOS_PEDIDO_EMAIL', eu, { texto: 'Pedido de dados enviado por e-mail para ' + para + ' (resposta para ' + (v.email || 'o e-mail do sistema') + ').' });
    });
  }
  return { proposta: ComP_detalhe_(eu, p.ID), pedido: ComDE_pedidoTela_(Object.assign({}, pd, { emailEnviadoPara: enviado }), true),
    message: 'Pedido criado: ' + Com_plural_(pd.campos.length, 'campo', 'campos') + ' para o cliente.' + (enviado ? ' E-mail enviado para ' + enviado + '.' : ' Copie o texto (e-mail ou WhatsApp) e envie ao cliente.') + ' A cobrança está em Minhas atividades.' };
}

/** Cancela o pedido em aberto (o link deixa de abrir). d: { id, motivo } */
function ComDE_cancelarPedido_(eu, d) {
  return Com_comTrava_(function () {
    var p = ComDE_obter_(eu, d && d.id, 'cancelar o pedido de dados');
    var pd = Com_json_(p.DADOS_PEDIDO_JSON, null);
    if (!pd || ['AGUARDANDO_CLIENTE', 'RESPONDIDO'].indexOf(pd.situacao) < 0) throw new Error('Não foi possível cancelar: não há pedido de dados em aberto nesta proposta');
    if (pd.linkHash) PropertiesService.getScriptProperties().deleteProperty('COM_DE_LINK_' + pd.linkHash);
    if (pd.atividadeId) Com_mudarAtividade_(pd.atividadeId, 'Cancelada', 'Pedido de dados cancelado.');
    if (pd.atividadeConferirId) Com_mudarAtividade_(pd.atividadeConferirId, 'Cancelada', 'Pedido de dados cancelado.');
    pd.situacao = 'CANCELADO'; pd.canceladoEm = Com_agora_(); pd.canceladoPorNome = eu.nome;
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { DADOS_PEDIDO_JSON: JSON.stringify(pd), DADOS_SITUACAO: '', ATUALIZADO_EM: pd.canceladoEm });
    Com_historico_('PROPOSTA', p.ID, 'DADOS_PEDIDO_CANCELADO', eu, { texto: 'Pedido de dados cancelado' + (Com_s_(d && d.motivo) ? ': ' + Com_texto_(d.motivo, 300) : '') + '. O link deixou de abrir.' });
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Pedido cancelado. O link enviado ao cliente deixou de abrir.' };
  });
}

/** Na nova revisão o pedido em aberto passa junto (o link continua o mesmo). */
function ComDE_aoRevisar_(p, nova) {
  try {
    var pd = Com_json_(p.DADOS_PEDIDO_JSON, null);
    if (!pd || ['AGUARDANDO_CLIENTE', 'RESPONDIDO'].indexOf(pd.situacao) < 0) return Com_s_(p.INTERMEDIARIO_JSON) ? { INTERMEDIARIO_JSON: Com_s_(p.INTERMEDIARIO_JSON) } : {};
    if (nova && nova.ID && pd.linkHash) PropertiesService.getScriptProperties().setProperty('COM_DE_LINK_' + pd.linkHash, Com_s_(nova.ID));
    return { DADOS_PEDIDO_JSON: Com_s_(p.DADOS_PEDIDO_JSON), DADOS_SITUACAO: Com_s_(p.DADOS_SITUACAO), INTERMEDIARIO_JSON: Com_s_(p.INTERMEDIARIO_JSON) };
  } catch (e) { return {}; }
}

// ------------------------------------------------------------
// LINK PÚBLICO (/dados-cliente/): ver e responder, sem login
// ------------------------------------------------------------
var COM_DE_INDISPONIVEL = 'Este link de dados não está disponível. Ele pode ter vencido, já ter sido respondido e conferido, ter sido trocado por um pedido mais novo ou estar incompleto (abra o link inteiro, direto da mensagem). Para receber um link novo, fale com quem enviou a mensagem.';
function ComDE_contato_() {
  var e = typeof RelA4_empresa_ === 'function' ? RelA4_empresa_() : {};
  return { nome: 'Metrolabs', telefone: Com_s_(e.telefone), email: '', site: Com_s_(e.site) };
}
function ComDE_indisponivel_() { return { ok: false, codigo: 'INDISPONIVEL', message: COM_DE_INDISPONIVEL, contato: ComDE_contato_() }; }
function ComDE_abrirLink_(token) {
  if (!/^[a-f0-9]{64}$/.test(Com_s_(token))) return null;
  var hash = ComDE_resumoToken_(token), id = PropertiesService.getScriptProperties().getProperty('COM_DE_LINK_' + hash);
  if (!id) return null;
  var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, id);
  if (!p || (typeof ComP_excluida_ === 'function' && ComP_excluida_(p))) return null;
  var pd = Com_json_(p.DADOS_PEDIDO_JSON, null);
  if (!pd || pd.linkHash !== hash || ['AGUARDANDO_CLIENTE', 'RESPONDIDO'].indexOf(pd.situacao) < 0) return null;
  if (Com_dia_(pd.validoAte) < Com_hoje_()) return null;
  if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) return null;
  return { p: p, pd: pd, hash: hash };
}
/** Só o necessário: número, nome do cliente (fantasia), quem pediu e os campos. Nenhum valor, nenhum dado já cadastrado. */
function ComDE_linkVer_(token, ctx) {
  var x = ComDE_abrirLink_(token);
  if (!x) return ComDE_indisponivel_();
  var p = x.p, pd = x.pd, v = typeof ComP_vendedor_ === 'function' ? ComP_vendedor_(p) : { nome: Com_s_(p.RESPONSAVEL_NOME) };
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  var r = { ok: true, estado: pd.situacao === 'RESPONDIDO' ? 'RESPONDIDO' : 'ABERTO', proposta: ComP_rotulo_(p), cliente: Com_s_(cli.NOME_FANTASIA) || Com_s_(p.CLIENTE_NOME),
    pedidoEm: Com_brDia_(pd.em), validoAte: Com_brDia_(pd.validoAte), vendedor: { nome: Com_s_(v.nome), email: Com_s_(v.email), telefone: Com_s_(v.telefone) }, contato: ComDE_contato_(), ufs: COM_DE_UFS };
  if (r.estado === 'RESPONDIDO') { r.respondidoEm = Com_br_(pd.resposta && pd.resposta.em); return r; }
  r.campos = (pd.defs || []).map(function (d) { return { chave: d.chave, bloco: d.bloco, titulo: d.titulo, grupoNome: d.grupoNome, rotulo: d.rotulo, tipo: d.tipo, opcional: !!d.opcional }; });
  return r;
}
/** dados: { valores: { chave: texto }, nome, email, cargo, obs }. Pelo menos um campo; o que vier em branco continua faltando. */
function ComDE_linkResponder_(token, dados, ctx) {
  dados = dados || {};
  var x0 = ComDE_abrirLink_(token);
  if (!x0) return ComDE_indisponivel_();
  if (x0.pd.situacao === 'RESPONDIDO') return ComDE_linkVer_(token, ctx);
  var nome = Com_texto_(dados.nome, 120).trim(), email = Com_s_(dados.email).toLowerCase().trim();
  if (nome.length < 5 || nome.split(/\s+/).length < 2) return { ok: false, codigo: 'ENTRADA', campo: 'nome', message: 'Informe o seu nome completo (nome e sobrenome).' };
  if (!ComDE_emailOk_(email)) return { ok: false, codigo: 'ENTRADA', campo: 'email', message: 'Informe o seu e-mail completo (ex.: nome@hospital.com.br), para conferirmos com você se precisar.' };
  var vals = dados.valores && typeof dados.valores === 'object' ? dados.valores : {}, limpos = {}, n = 0;
  var permitidos = x0.pd.campos || [];
  for (var i = 0; i < permitidos.length; i++) {
    var ch = permitidos[i];
    if (!Object.prototype.hasOwnProperty.call(vals, ch)) continue;
    var v = ComDE_validar_(ch, vals[ch]);
    if (!v.ok) return { ok: false, codigo: 'ENTRADA', campo: ch, message: v.erro + '.' };
    if (v.valor) { limpos[ch] = v.valor; n++; }
  }
  if (!n) return { ok: false, codigo: 'ENTRADA', campo: '', message: 'Preencha pelo menos um dos campos. O que ficar em branco continua pendente.' };
  var r = Com_comTrava_(function () {
    var x = ComDE_abrirLink_(token);
    if (!x) return { ok: false, codigo: 'INDISPONIVEL' };
    if (x.pd.situacao === 'RESPONDIDO') return { ja: true };
    var agora = Com_agora_(), pd = x.pd, p = x.p;
    var c = ctx || {};
    pd.resposta = { em: agora, nome: nome, email: email, cargo: Com_texto_(dados.cargo, 120), obs: Com_texto_(dados.obs, 1000), valores: limpos, emBranco: permitidos.filter(function (k) { return !limpos[k]; }),
      ip: Com_texto_(c.ip, 60), navegador: Com_texto_(c.navegador, 200) };
    pd.situacao = 'RESPONDIDO';
    var quem = { id: 'CLIENTE', nome: 'Cliente pelo link: ' + nome };
    try {
      if (pd.atividadeId && Com_atividadeAberta_(Com_atividade_(pd.atividadeId))) Com_mudarAtividade_(pd.atividadeId, 'Concluída', 'O cliente respondeu pelo link em ' + Com_br_(agora) + ' (' + nome + ').');
      pd.atividadeConferirId = Com_criarAtividade_({ responsavelId: Com_s_(p.RESPONSAVEL_ID), titulo: 'Conferir os dados enviados pelo cliente: ' + ComP_rotulo_(p) + ' (' + Com_texto_(p.CLIENTE_NOME, 60) + ')',
        descricao: nome + ' (' + email + ') enviou ' + Com_plural_(n, 'dado', 'dados') + ' pelo link em ' + Com_br_(agora) + '. Os dados só entram no cadastro depois da sua conferência.',
        prazo: Com_somarDiasUteis_(Com_hoje_(), 1) + 'T12:00', clienteId: Com_s_(p.CLIENTE_ID), unidadeId: Com_s_(p.UNIDADE_ID), porQue: 'Nada do que o cliente envia entra no cadastro sem conferência (regra do dono).',
        onde: 'Comercial > Propostas > ' + ComP_rotulo_(p), como: 'Abra a proposta, toque em "Conferir os dados do cliente", aceite ou recuse cada campo e aplique.', restrita: true });
    } catch (eA) { pd.atividadeErro = String((eA && eA.message) || eA).slice(0, 200); }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { DADOS_PEDIDO_JSON: JSON.stringify(pd), DADOS_SITUACAO: 'RESPONDIDO', ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'DADOS_RESPOSTA', quem, { de: COM_DE_SITUACOES.AGUARDANDO_CLIENTE, para: COM_DE_SITUACOES.RESPONDIDO, texto: nome + ' (' + email + ') enviou ' + Com_plural_(n, 'dado', 'dados') + ' pelo link' + (pd.resposta.emBranco.length ? '; ' + Com_plural_(pd.resposta.emBranco.length, 'campo ficou', 'campos ficaram') + ' em branco' : '') + '. Pendente de conferência.' });
    Com_avisar_(Com_s_(p.RESPONSAVEL_ID), 'DADOS_RESPOSTA', 'O cliente enviou os dados: ' + ComP_rotulo_(p), Com_s_(p.CLIENTE_NOME) + ': ' + nome + ' enviou ' + Com_plural_(n, 'dado', 'dados') + ' pelo link. Confira na proposta ("Conferir os dados do cliente") antes de emitir; nada entra no cadastro sem a sua conferência.', { tipo: 'proposta', id: p.ID }, { email: true });
    return { ok: true };
  });
  if (r && r.ok === false) return ComDE_indisponivel_();
  return { ok: true, estado: 'RESPONDIDO', proposta: ComP_rotulo_(x0.p), respondidoEm: Com_br_(Com_agora_()), message: 'Dados recebidos. Obrigado! A Metrolabs confere e, se precisar de algo mais, entra em contato.' };
}
function ComDE_linkPdf_(token) { return ComDE_indisponivel_(); }

// ------------------------------------------------------------
// CONFERIR (vendedor) E APLICAR
// ------------------------------------------------------------
function ComDE_valorAtual_(p, ch) {
  var parte = ch.split('.'), pre = parte[0], campo = parte[parte.length - 1];
  try {
    if (pre === 'CLI') { var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {}; return campo === 'CNPJ' ? Com_s_(c.CNPJ) || Com_s_(c.CPF) : Com_s_(c[campo]); }
    if (pre === 'UN') { var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(p.UNIDADE_ID)) || {}; return Com_s_(u[campo]); }
    if (pre === 'CT') { var t = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) || {} : {}; return campo === 'TELEFONE' ? Com_s_(t.CELULAR) || Com_s_(t.TELEFONE) : Com_s_(t[campo]); }
    if (pre === 'EQC') { var e = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, parte[1]) || {}; return Com_s_(e[campo]); }
  } catch (e2) {}
  return '';
}
function ComDE_respostaTela_(p, pd) {
  var r = pd.resposta || {}, defs = {};
  (pd.defs || []).forEach(function (d) { defs[d.chave] = d; });
  return { em: Com_br_(r.em), nome: Com_s_(r.nome), email: Com_s_(r.email), cargo: Com_s_(r.cargo), obs: Com_s_(r.obs), emBranco: (r.emBranco || []).length,
    campos: Object.keys(r.valores || {}).map(function (ch) { var d = defs[ch] || {}; return { chave: ch, titulo: Com_s_(d.titulo), rotulo: Com_s_(d.rotulo) || ch, valor: Com_s_(r.valores[ch]), atual: ComDE_valorAtual_(p, ch) }; }) };
}

/**
 * Aplica valores conferidos (por quem preenche ou pela conferência da resposta do cliente). Nunca apaga: só grava o que veio.
 * Cliente e unidade pelas funções do Cadastro (merge, histórico em HIST_CADASTROS); contato no cadastro de contatos (merge);
 * equipamento do cadastro: só os campos em branco; equipamento do item: vai para a proposta (ITENS_JSON.equipamentos).
 * Devolve { aplicados[], avisos[] }. Lança no padrão do operador.
 */
function ComDE_aplicar_(eu, sid, p, valores, origem) {
  var grupos = { CLI: {}, UN: {}, CT: {}, EQC: {}, EQ: {} }, aplicados = [], avisos = [];
  Object.keys(valores || {}).forEach(function (ch) {
    var v = ComDE_validar_(ch, valores[ch]);
    if (!v.ok) throw new Error('Não foi possível aplicar: ' + (((COM_DE_CAMPOS[ch.split('.')[0]] || {})[ch.split('.').pop()] || {}).r || ch) + ': ' + v.erro + '. Corrija e tente de novo; nada foi gravado');
    if (!v.valor) return;
    var parte = ch.split('.'), pre = parte[0];
    if (pre === 'CLI') { if (parte[1] === 'CNPJ') grupos.CLI[v.doc === 'CPF' ? 'CPF' : 'CNPJ'] = v.valor; else grupos.CLI[parte[1]] = v.valor; }
    else if (pre === 'UN' || pre === 'CT') grupos[pre][parte[1]] = v.valor;
    else if (pre === 'EQC') { (grupos.EQC[parte[1]] = grupos.EQC[parte[1]] || {})[parte[2]] = v.valor; }
    else if (pre === 'EQ') { var k = parte[1] + '.' + parte[2]; (grupos.EQ[k] = grupos.EQ[k] || { ordem: Number(parte[1]), slot: Number(parte[2]) })[parte[3]] = v.valor; }
  });
  var s = Com_up_(p.SITUACAO);
  // cliente
  if (Object.keys(grupos.CLI).length) {
    var cid = Com_s_(p.CLIENTE_ID), antes = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, cid);
    if (!antes) throw new Error('Não foi possível aplicar: o cliente da proposta não está mais no cadastro (pode ter sido juntado em outro). Atualize a tela');
    var payload = Object.assign({ CIENTE: 'SIM', ORIGEM_TELA: origem }, grupos.CLI);
    if (typeof SGO_CLIENTES !== 'undefined' && SGO_CLIENTES && typeof SGO_CLIENTES.atualizar === 'function' && sid) {
      var rc = SGO_CLIENTES.atualizar(sid, cid, payload);
      if (!rc || !rc.success) throw new Error('Não foi possível aplicar no cadastro do cliente: ' + Com_s_(rc && rc.message).replace(/[.\s]+$/, '') + '. Nada do cliente foi gravado');
    } else {
      var dir = Object.assign({}, grupos.CLI, { ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_(), CIENTE_POR_NOME: eu.nome, CIENTE_EM: Com_agora_() });
      var fut = Object.assign({}, antes, dir);
      if (['CEP', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF'].some(function (k) { return grupos.CLI[k]; }) && Com_s_(fut.LOGRADOURO) && Com_s_(fut.CIDADE))
        dir.ENDERECO = [Com_s_(fut.LOGRADOURO) + (Com_s_(fut.NUMERO) ? ', ' + Com_s_(fut.NUMERO) : '') + (Com_s_(fut.COMPLEMENTO) ? ' - ' + Com_s_(fut.COMPLEMENTO) : ''), Com_s_(fut.BAIRRO), Com_s_(fut.CIDADE) + (Com_s_(fut.UF) ? '/' + Com_s_(fut.UF) : ''), Com_s_(fut.CEP) ? 'CEP ' + Com_s_(fut.CEP) : ''].filter(Boolean).join(', ').toUpperCase();
      SGO_DATA.update(SGO_CFG.SHEETS.CAD_CLIENTES, cid, dir);
    }
    var depois = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, cid) || {};
    if (typeof CadQ_registrar_ === 'function') {
      var sess = { userId: eu.id, nome: eu.nome, usuario: eu.login, perfil: eu.perfil };
      CadQ_registrar_(sess, { entidade: 'CLIENTE', registroId: cid, registroNome: Com_s_(depois.RAZAO_SOCIAL || depois.NOME_FANTASIA), acao: 'ALTERAR', origem: origem, ciente: true,
        campos: typeof CadQ_diff_ === 'function' ? CadQ_diff_(antes, depois, CADQ_CAMPOS_HIST.CLIENTE) : [], problemasAntes: CadQ_problemasCliente_(antes), problemasDepois: CadQ_problemasCliente_(depois) });
    }
    aplicados.push('cadastro do cliente (' + Object.keys(grupos.CLI).map(function (k) { return (COM_DE_CAMPOS.CLI[k] || { r: k }).r.toLowerCase(); }).join(', ') + ')');
  }
  // unidade (local de execução)
  if (Object.keys(grupos.UN).length) {
    var uid = Com_s_(p.UNIDADE_ID), uAntes = uid ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, uid) : null;
    if (!uAntes) throw new Error('Não foi possível aplicar: a unidade da proposta não está mais no cadastro. Atualize a tela');
    if (typeof SGO_UNIDADES !== 'undefined' && SGO_UNIDADES && typeof SGO_UNIDADES.atualizar === 'function' && sid) {
      var ru = SGO_UNIDADES.atualizar(sid, uid, Object.assign({ CIENTE: 'SIM' }, grupos.UN));
      if (!ru || !ru.success) throw new Error('Não foi possível aplicar na unidade: ' + Com_s_(ru && ru.message).replace(/[.\s]+$/, '') + '. Nada da unidade foi gravado');
    } else SGO_DATA.update(SGO_CFG.SHEETS.CAD_UNIDADES, uid, Object.assign({}, grupos.UN));
    if (typeof CadQ_registrar_ === 'function') {
      var uDep = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, uid) || {};
      CadQ_registrar_({ userId: eu.id, nome: eu.nome, usuario: eu.login, perfil: eu.perfil }, { entidade: 'UNIDADE', registroId: uid, registroNome: Com_s_(uDep.NOME_UNIDADE), acao: 'ALTERAR', origem: origem, ciente: true,
        campos: typeof CadQ_diff_ === 'function' ? CadQ_diff_(uAntes, uDep, CADQ_CAMPOS_HIST.UNIDADE) : [], problemasAntes: CadQ_problemasUnidade_(uAntes), problemasDepois: CadQ_problemasUnidade_(uDep) });
    }
    aplicados.push('local de execução (' + Object.keys(grupos.UN).map(function (k) { return grupos.UN[k]; }).join('/') + ')');
  }
  // contato da proposta
  var mudaProp = {};
  if (Object.keys(grupos.CT).length) {
    var ct = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) : null;
    // 11/11/2026: A/C intermediário: os dados informados são de OUTRA pessoa (o responsável técnico): contato novo, e o intermediário fica registrado
    if (ct && Com_up_(ct.PAPEL) === 'INTERMEDIARIO') ct = null;
    var tel = grupos.CT.TELEFONE || '', base = ct ? { id: Com_s_(ct.ID), nome: Com_s_(ct.NOME), cargo: Com_s_(ct.CARGO), papel: Com_s_(ct.PAPEL), email: Com_s_(ct.EMAIL), celular: Com_s_(ct.CELULAR), telefone: Com_s_(ct.TELEFONE), principal: Com_up_(ct.PRINCIPAL) === 'SIM', obs: Com_s_(ct.OBS) } : { nome: '', email: '', celular: '', telefone: '' };
    var dc = Object.assign({}, base, { clienteId: Com_s_(p.CLIENTE_ID), unidadeId: ct ? Com_s_(ct.UNIDADE_ID) : Com_s_(p.UNIDADE_ID) });
    if (grupos.CT.NOME) dc.nome = grupos.CT.NOME;
    if (grupos.CT.CARGO) dc.cargo = grupos.CT.CARGO;
    if (!ct) dc.papel = 'TECNICO';
    if (grupos.CT.EMAIL) dc.email = grupos.CT.EMAIL;
    if (tel) { if (tel.length === 11) dc.celular = tel; else dc.telefone = tel; }
    if (!ComDE_dig_(dc.celular) || ComDE_dig_(dc.celular).length !== 11) { if (ComDE_dig_(dc.celular) && !dc.telefone) dc.telefone = dc.celular; dc.celular = ComDE_dig_(dc.celular).length === 11 ? dc.celular : ''; }
    if (!ct) { if (!['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf || ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(s) < 0) throw new Error('Não foi possível aplicar o contato: a proposta não está mais antes do envio'); if (Com_s_(dc.nome).length < 3) throw new Error('Não foi possível aplicar o contato: falta o nome de quem recebe a proposta. Informe o nome junto com o e-mail e o telefone'); }
    var novoCt = ComCt_salvar_(eu, dc);
    if (!ct && novoCt && novoCt.id) { mudaProp.CONTATO_ID = novoCt.id; mudaProp.CONTATO_NOME = Com_s_(novoCt.nome); }
    var ctAnt = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) : null;
    if (ctAnt && Com_up_(ctAnt.PAPEL) === 'INTERMEDIARIO' && !Com_s_(p.INTERMEDIARIO_JSON)) mudaProp.INTERMEDIARIO_JSON = JSON.stringify({ nome: Com_s_(ctAnt.NOME), tipo: 'PESSOA', contatoId: Com_s_(ctAnt.ID), comissaoTipo: 'PCT', comissao: null, motivo: 'Era o A/C da proposta; o responsável técnico passou a ser ' + Com_s_(dc.nome) + '.', porId: eu.id, porNome: eu.nome, em: Com_agora_() });
    aplicados.push('contato ' + Com_s_((novoCt && novoCt.nome) || dc.nome));
  }
  // equipamento do cadastro: só os campos em branco
  Object.keys(grupos.EQC).forEach(function (eid) {
    var e = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, eid);
    if (!e || Com_s_(e.CLIENTE_ID) !== Com_s_(p.CLIENTE_ID)) { avisos.push('o equipamento ' + eid + ' não é mais deste cliente: os dados dele não foram gravados'); return; }
    var muda = {};
    Object.keys(grupos.EQC[eid]).forEach(function (k) { if (!Com_s_(e[k])) muda[k] = grupos.EQC[eid][k]; else if (Com_s_(e[k]) !== grupos.EQC[eid][k]) avisos.push('o ' + k.toLowerCase() + ' do equipamento ' + (Com_s_(e.TAG) || eid) + ' já estava preenchido no cadastro e não foi trocado'); });
    if (Object.keys(muda).length) {
      SGO_DATA.update(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, eid, muda);
      Com_historico_('PROPOSTA', p.ID, 'DADOS_EQUIPAMENTO', eu, { texto: 'Cadastro do equipamento ' + (Com_s_(e.TAG) || Com_s_(e.TIPO) || eid) + ' completado (' + origem + '): ' + Object.keys(muda).map(function (k) { return k.toLowerCase() + ' ' + muda[k]; }).join('; ') + '.' });
      aplicados.push('equipamento ' + (Com_s_(e.TAG) || Com_s_(e.TIPO) || eid));
    }
  });
  // equipamento informado do item (vai para a proposta)
  var blocos = Object.keys(grupos.EQ);
  if (blocos.length) {
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(s) < 0) throw new Error('Não foi possível aplicar os equipamentos: a proposta ' + ComP_rotulo_(p) + ' já foi enviada. Faça nova revisão e identifique os equipamentos nela');
    var itens = Com_json_(p.ITENS_JSON, []) || [];
    blocos.sort().forEach(function (k) {
      var b = grupos.EQ[k], it = itens.filter(function (x) { return Number(x.ordem) === b.ordem && !x.auto; })[0];
      if (!it) { avisos.push('o item ' + b.ordem + ' não existe mais na proposta: o equipamento informado não foi gravado'); return; }
      it.equipamentos = Array.isArray(it.equipamentos) ? it.equipamentos : [];
      if (it.equipamentos.length >= COM_DE_MAX_SLOTS) { avisos.push('o item ' + b.ordem + ' já tem ' + COM_DE_MAX_SLOTS + ' equipamentos'); return; }
      var novoEq = { tipo: b.TIPO || '', marca: b.MARCA || '', modelo: b.MODELO || '', serie: b.SERIE || '', capacidade: b.CAPACIDADE || '', setor: b.SETOR || '', origem: /cliente/i.test(origem) ? 'CLIENTE' : 'VENDEDOR', conferidoPor: eu.nome, conferidoEm: Com_agora_() };
      // 11/11/2026: o equipamento conferido vai para o cadastro único (o mesmo da Assistência e da qualificação) e o item passa a apontar para ele
      var eqId = ComDE_cadastrarEquipamento_(p, novoEq, eu);
      if (eqId && !it.equipamentos.some(function (x) { return Com_s_(x.equipamentoId) === eqId; }) && Com_s_(it.equipamentoId) !== eqId) { it.equipamentos.push({ equipamentoId: eqId, texto: [novoEq.tipo, novoEq.serie ? 'série ' + novoEq.serie : ''].filter(Boolean).join(' · ') }); avisos.push('equipamento ' + (novoEq.serie ? 'série ' + novoEq.serie : novoEq.tipo) + ' no cadastro de equipamentos da unidade'); }
      else if (!eqId) it.equipamentos.push(novoEq);
    });
    mudaProp.ITENS_JSON = JSON.stringify(itens);
    aplicados.push(Com_plural_(blocos.length, 'equipamento informado', 'equipamentos informados') + ' nos itens');
    if (Com_s_(p.PDF_ID) && s === 'PRONTA') avisos.push('o documento já gerado não traz estes equipamentos: gere o documento de novo antes de enviar');
  }
  if (Object.keys(mudaProp).length) { mudaProp.ATUALIZADO_EM = Com_agora_(); SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, mudaProp); }
  return { aplicados: aplicados, avisos: avisos };
}

/** "Preencher agora" (dado que o vendedor já recebeu do cliente). d: { id, valores: { chave: valor }, ciente } */
function ComDE_preencher_(eu, sid, d) {
  d = d || {};
  if (!(d.ciente === true || Com_up_(d.ciente) === 'SIM')) throw new Error('Não foi possível gravar: marque "Ciente — os dados foram informados pelo cliente". A marca registra quem conferiu e quando; não use dado buscado na internet');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComDE_obter_(eu, d.id, 'preencher os dados');
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) throw new Error('Não foi possível preencher pela proposta: ela está "' + (COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || p.SITUACAO) + '". Corrija o cadastro em Cadastros');
    var pedidas = {};
    ComDE_faltas_(p).forEach(function (f) { (f.campos || []).forEach(function (c) { pedidas[c] = 1; }); });
    var vals = {};
    Object.keys(d.valores || {}).forEach(function (ch) { if (pedidas[ch]) vals[ch] = d.valores[ch]; });
    if (!Object.keys(vals).some(function (ch) { return Com_s_(vals[ch]); })) throw new Error('Não foi possível gravar: preencha pelo menos um campo do que falta');
    var r = ComDE_aplicar_(eu, sid, p, vals, 'Comercial > Proposta ' + ComP_rotulo_(p) + ' (preenchido pelo vendedor)');
    Com_historico_('PROPOSTA', p.ID, 'DADOS_PREENCHIDOS', eu, { texto: 'Dados para emitir preenchidos por ' + eu.nome + ': ' + (r.aplicados.join('; ') || 'nada') + '.' + (r.avisos.length ? ' Atenção: ' + r.avisos.join('; ') + '.' : '') });
    var resto = ComDE_faltas_(SGO_DATA.getById(COM_ABAS.PROPOSTAS, p.ID));
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Gravado: ' + (r.aplicados.join('; ') || 'nada') + '.' + (r.avisos.length ? ' Atenção: ' + r.avisos.join('; ') + '.' : '') + (resto.length ? ' Ainda ' + (resto.length === 1 ? 'falta 1 dado' : 'faltam ' + resto.length + ' dados') + ' para emitir.' : ' Dados completos: a proposta pode ser emitida.') };
  });
}

/** Conferência da resposta do cliente. d: { id, aceitos: [chaves], recusados: [{ chave, motivo }] } */
function ComDE_conferir_(eu, sid, d) {
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComDE_obter_(eu, d.id, 'conferir os dados do cliente');
    var pd = Com_json_(p.DADOS_PEDIDO_JSON, null);
    if (!pd || pd.situacao !== 'RESPONDIDO' || !pd.resposta) throw new Error('Não foi possível conferir: não há resposta do cliente esperando conferência nesta proposta. Atualize a tela');
    var recebidos = pd.resposta.valores || {}, aceitos = (Array.isArray(d.aceitos) ? d.aceitos : []).filter(function (ch) { return Object.prototype.hasOwnProperty.call(recebidos, ch); });
    var recusados = (Array.isArray(d.recusados) ? d.recusados : []).filter(function (x) { return x && Object.prototype.hasOwnProperty.call(recebidos, x.chave) && aceitos.indexOf(x.chave) < 0; });
    var semDecisao = Object.keys(recebidos).filter(function (ch) { return aceitos.indexOf(ch) < 0 && !recusados.some(function (x) { return x.chave === ch; }); });
    if (semDecisao.length) throw new Error('Não foi possível concluir a conferência: ' + Com_plural_(semDecisao.length, 'campo ficou', 'campos ficaram') + ' sem decisão. Marque "Aceitar" ou "Recusar" em cada um; nada foi gravado');
    recusados.forEach(function (x) { if (Com_texto_(x.motivo, 300).length < 5) throw new Error('Não foi possível concluir a conferência: escreva o motivo da recusa de cada campo recusado (ex.: "CNPJ de outra filial"); nada foi gravado'); });
    var vals = {};
    aceitos.forEach(function (ch) { vals[ch] = recebidos[ch]; });
    var r = Object.keys(vals).length ? ComDE_aplicar_(eu, sid, p, vals, 'Comercial > Proposta ' + ComP_rotulo_(p) + ' (dados do cliente pelo link, conferidos por ' + eu.nome + ')') : { aplicados: [], avisos: [] };
    var atual = SGO_DATA.getById(COM_ABAS.PROPOSTAS, p.ID), agora = Com_agora_();
    pd = Com_json_(atual.DADOS_PEDIDO_JSON, pd);
    pd.situacao = 'CONFERIDO'; pd.conferidoEm = agora; pd.conferidoPorId = eu.id; pd.conferidoPorNome = eu.nome; pd.aceitos = aceitos; pd.recusados = recusados.map(function (x) { return { chave: x.chave, motivo: Com_texto_(x.motivo, 300) }; });
    if (pd.linkHash) PropertiesService.getScriptProperties().deleteProperty('COM_DE_LINK_' + pd.linkHash);
    if (pd.atividadeConferirId) Com_mudarAtividade_(pd.atividadeConferirId, 'Concluída', 'Dados conferidos por ' + eu.nome + ' em ' + Com_br_(agora) + '.');
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { DADOS_PEDIDO_JSON: JSON.stringify(pd), DADOS_SITUACAO: '', ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'DADOS_CONFERIDOS', eu, { de: COM_DE_SITUACOES.RESPONDIDO, texto: 'Dados do cliente conferidos: ' + aceitos.length + ' aceitos, ' + recusados.length + ' recusados' + (recusados.length ? ' (' + recusados.map(function (x) { return x.chave + ': ' + Com_texto_(x.motivo, 120); }).join('; ') + ')' : '') + '. Gravado: ' + (r.aplicados.join('; ') || 'nada') + '.' + (r.avisos.length ? ' Atenção: ' + r.avisos.join('; ') + '.' : '') });
    var resto = ComDE_faltas_(SGO_DATA.getById(COM_ABAS.PROPOSTAS, p.ID));
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Conferência registrada: ' + aceitos.length + ' aceitos, ' + recusados.length + ' recusados.' + (r.avisos.length ? ' Atenção: ' + r.avisos.join('; ') + '.' : '') + (resto.length ? ' Ainda ' + (resto.length === 1 ? 'falta 1 dado' : 'faltam ' + resto.length + ' dados') + ': peça de novo ao cliente ou preencha.' : ' Dados completos: a proposta pode ser emitida.') };
  });
}

// ------------------------------------------------------------
// INTERMEDIÁRIO E COMISSÃO DE INTERMEDIAÇÃO (11/11/2026, caso RIO MED)
// ------------------------------------------------------------
/**
 * O intermediário (pessoa ou empresa que indica a venda e busca comissão) fica registrado na proposta (INTERMEDIARIO_JSON), só interno.
 * A comissão pedida (percentual sobre os serviços e produtos, ou valor) entra na sobra como a comissão do vendedor (ComPr_analise_); não
 * há percentual padrão: vazio = a Diretoria define. A emissão espera a decisão da Diretoria (falta INT.APROVACAO). Mudou o intermediário
 * ou a comissão, a aprovação cai. Nada disso vai ao documento do cliente.
 */
function ComDE_marcaIntermediario_(i) { return Com_marca_(JSON.stringify([Com_normBusca_(i.nome), Com_up_(i.tipo), Com_up_(i.comissaoTipo), i.comissao === null || i.comissao === undefined ? '' : Number(i.comissao)])); }
function ComDE_intermediarioAprovado_(i) { return !!(i && i.aprovacao && i.aprovacao.decisao === 'APROVADA' && i.aprovacao.marca === ComDE_marcaIntermediario_(i)); }
/** d: { id, nome, tipo (PESSOA|EMPRESA), documento, contatoId, comissaoTipo (PCT|VALOR), comissao (vazio = a Diretoria define), motivo, remover } */
function ComDE_salvarIntermediario_(eu, d) {
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComDE_obter_(eu, d.id, 'registrar o intermediário');
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) throw new Error('Não foi possível registrar o intermediário: a proposta já foi ao cliente. Faça nova revisão');
    var antes = Com_json_(p.INTERMEDIARIO_JSON, null), agora = Com_agora_();
    if (d.remover === true) {
      SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { INTERMEDIARIO_JSON: '', ATUALIZADO_EM: agora });
      Com_historico_('PROPOSTA', p.ID, 'INTERMEDIARIO', eu, { texto: 'Intermediário retirado da proposta' + (antes ? ' (' + Com_s_(antes.nome) + ')' : '') + '.' });
      return { proposta: ComP_detalhe_(eu, p.ID), message: 'Intermediário retirado.' };
    }
    var nome = Com_texto_(d.nome, 160).trim();
    if (nome.length < 3) throw new Error('Não foi possível registrar: escreva o nome do intermediário (pessoa ou empresa)');
    var tipoC = Com_up_(d.comissaoTipo) === 'VALOR' ? 'VALOR' : 'PCT', c = Com_s_(d.comissao) === '' ? null : Com_num_(d.comissao);
    if (c !== null && !(isFinite(c) && c >= 0 && (tipoC === 'VALOR' || c <= 50))) throw new Error('Não foi possível registrar: a comissão é um percentual de 0 a 50 ou um valor em reais; em branco, a Diretoria define');
    var motivo = Com_texto_(d.motivo, 500).trim();
    if (motivo.length < 10) throw new Error('Não foi possível registrar: escreva o motivo (pelo menos 10 letras), por exemplo "Bruno indicou o hospital de Angra e pede comissão sobre o contrato"');
    var ct = Com_s_(d.contatoId) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(d.contatoId)) : null;
    var i = { nome: nome, tipo: Com_up_(d.tipo) === 'EMPRESA' ? 'EMPRESA' : 'PESSOA', documento: Com_texto_(d.documento, 30), contatoId: ct ? Com_s_(ct.ID) : '', comissaoTipo: tipoC, comissao: c, motivo: motivo, porId: eu.id, porNome: eu.nome, em: agora };
    if (antes && antes.aprovacao && antes.aprovacao.marca === ComDE_marcaIntermediario_(i)) i.aprovacao = antes.aprovacao;
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { INTERMEDIARIO_JSON: JSON.stringify(i), ATUALIZADO_EM: agora });
    if (ct && Com_up_(ct.PAPEL) !== 'INTERMEDIARIO') SGO_DATA.update(COM_ABAS.CONTATOS, ct.ID, { PAPEL: 'INTERMEDIARIO', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'INTERMEDIARIO', eu, { texto: 'Intermediário registrado: ' + nome + ' (' + (i.tipo === 'EMPRESA' ? 'empresa' : 'pessoa') + '); comissão pedida: ' + (c === null ? 'a Diretoria define' : tipoC === 'VALOR' ? Com_moeda_(c) : String(c).replace('.', ',') + '% dos serviços e produtos') + '. Motivo: ' + motivo + (i.aprovacao ? '' : '. Aguarda a Diretoria.') });
    if (!i.aprovacao) {
      var us = Com_usuarios_();
      Object.keys(us).filter(function (k) { return us[k].ativo && (us[k].perfil === 'DIRETORIA' || Com_ehDono_(us[k].login)) && k !== eu.id; }).forEach(function (k) {
        Com_avisar_(k, 'INTERMEDIACAO', 'Comissão de intermediação para decidir: ' + ComP_rotulo_(p), Com_s_(p.CLIENTE_NOME) + ': ' + eu.nome + ' registrou ' + nome + ' como intermediário. Comissão pedida: ' + (c === null ? 'a definir pela Diretoria' : tipoC === 'VALOR' ? 'valor informado na proposta' : String(c).replace('.', ',') + '%') + '. Motivo: ' + motivo + '. Abra a proposta e toque em "Decidir a comissão".', { tipo: 'proposta', id: p.ID }, { email: true });
      });
    }
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Intermediário registrado. ' + (i.aprovacao ? 'A decisão da Diretoria continua valendo.' : 'A comissão aguarda a Diretoria; a proposta só é emitida depois da decisão.') + ' Nada disso aparece no documento do cliente.' };
  });
}
/** Diretoria decide. d: { id, aprovar (true|false), comissaoTipo, comissao, texto } */
function ComDE_decidirIntermediario_(eu, d) {
  d = d || {};
  if (!ComDE_podeLiberar_(eu)) throw new Error('Não foi possível decidir: a comissão de intermediação é decisão da Diretoria (ou do Administrador e do dono)');
  var texto = Com_texto_(d.texto, 500).trim();
  if (texto.length < 10) throw new Error('Não foi possível decidir: escreva a fundamentação (pelo menos 10 letras). O vendedor recebe o aviso');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComP_obter_(eu, d.id, 'decidir a comissão');
    var i = Com_json_(p.INTERMEDIARIO_JSON, null);
    if (!i || !Com_s_(i.nome)) throw new Error('Não foi possível decidir: a proposta não tem intermediário registrado');
    var agora = Com_agora_();
    if (d.aprovar === true) {
      var tipoC = Com_up_(d.comissaoTipo) === 'VALOR' ? 'VALOR' : 'PCT', c = Com_num_(d.comissao);
      if (!(isFinite(c) && c >= 0 && (tipoC === 'VALOR' || c <= 50))) throw new Error('Não foi possível aprovar: informe a comissão (percentual de 0 a 50 sobre os serviços e produtos, ou valor em reais). Não há percentual padrão');
      i.comissaoTipo = tipoC; i.comissao = c;
      i.aprovacao = { decisao: 'APROVADA', comissaoTipo: tipoC, comissao: c, porId: eu.id, porNome: eu.nome, em: agora, texto: texto, marca: ComDE_marcaIntermediario_(i) };
    } else i.aprovacao = { decisao: 'NEGADA', porId: eu.id, porNome: eu.nome, em: agora, texto: texto, marca: '' };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { INTERMEDIARIO_JSON: JSON.stringify(i), ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'INTERMEDIARIO_DECISAO', eu, { texto: 'Comissão de intermediação de ' + Com_s_(i.nome) + ' ' + (d.aprovar === true ? 'aprovada: ' + (i.comissaoTipo === 'VALOR' ? Com_moeda_(i.comissao) : String(i.comissao).replace('.', ',') + '% dos serviços e produtos') : 'negada') + ' por ' + eu.nome + '. ' + texto });
    if (Com_s_(p.RESPONSAVEL_ID) !== eu.id) Com_avisar_(Com_s_(p.RESPONSAVEL_ID), 'INTERMEDIACAO', 'Comissão de intermediação ' + (d.aprovar === true ? 'aprovada' : 'negada') + ': ' + ComP_rotulo_(p), Com_s_(p.CLIENTE_NOME) + ': ' + eu.nome + ' ' + (d.aprovar === true ? 'aprovou' : 'negou') + ' a comissão de ' + Com_s_(i.nome) + '. ' + texto + (d.aprovar === true ? '' : ' Retire o intermediário da proposta ou converse com a Diretoria.'), { tipo: 'proposta', id: p.ID }, { email: true });
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Decisão registrada. ' + (d.aprovar === true ? 'A comissão entra na sobra da proposta.' : 'A proposta só é emitida sem o intermediário ou com nova decisão.') };
  });
}

/** Unidade de execução da proposta (antes do envio). d: { id, unidadeId } */
function ComDE_definirUnidade_(eu, d) {
  d = d || {};
  return Com_comTrava_(function () {
    var p = ComDE_obter_(eu, d.id, 'escolher a unidade de execução');
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0 || Com_s_(p.PDF_ID)) throw new Error('Não foi possível trocar a unidade: a proposta já tem documento ou foi ao cliente. Faça nova revisão');
    var un = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(d.unidadeId));
    if (!un || Com_s_(un.CLIENTE_ID) !== Com_s_(p.CLIENTE_ID)) throw new Error('Não foi possível usar a unidade: ela não é deste cliente. Cadastre a unidade em Cadastros > Unidades e escolha de novo');
    var itens = Com_json_(p.ITENS_JSON, []) || [];
    if (itens.some(function (i) { return Com_s_(i.equipamentoId) || (i.equipamentos || []).some(function (e) { return Com_s_(e.equipamentoId); }); })) throw new Error('Não foi possível trocar a unidade: há equipamentos do cadastro escolhidos nos itens (eles são da unidade atual). Tire-os dos itens no rascunho e troque a unidade');
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { UNIDADE_ID: Com_s_(un.ID), UNIDADE_NOME: Com_s_(un.NOME_UNIDADE), ATUALIZADO_EM: Com_agora_() });
    Com_historico_('PROPOSTA', p.ID, 'UNIDADE_EXECUCAO', eu, { de: Com_s_(p.UNIDADE_NOME), para: Com_s_(un.NOME_UNIDADE), texto: 'Unidade de execução: ' + Com_s_(un.NOME_UNIDADE) + (Com_s_(un.CIDADE) ? ' (' + Com_s_(un.CIDADE) + '/' + Com_s_(un.UF) + ')' : '') + '.' });
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Unidade de execução: ' + Com_s_(un.NOME_UNIDADE) + '. Ela é o destino da viagem e o local dos equipamentos.' };
  });
}

/**
 * Equipamento informado (pelo cliente ou pelo vendedor, conferido) entra no cadastro único de equipamentos (CAD_EQUIPAMENTOS), o mesmo da
 * Assistência, da qualificação e dos certificados: com o número de série já cadastrado no cliente, liga ao existente; sem série ou sem
 * unidade, fica só na proposta. Devolve o id do equipamento ou ''.
 */
function ComDE_cadastrarEquipamento_(p, e, eu) {
  // 11/11/2026 (decisão do dono): sem número de série também entra no cadastro, marcado "série a confirmar" (a emissão continua pedindo a série)
  var serie = Com_normBusca_(e.serie).replace(/\s+/g, '');
  if (!Com_s_(p.UNIDADE_ID) || !Com_s_(e.tipo)) return '';
  var existe = serie ? ComDE_lerSeguro_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (x) { return Com_s_(x.CLIENTE_ID) === Com_s_(p.CLIENTE_ID) && Com_normBusca_(x.SERIE).replace(/\s+/g, '') === serie && Com_up_(x.STATUS || 'ATIVO') !== 'INATIVO'; })[0] : null;
  if (existe) return Com_s_(existe.ID);
  try { if (!serie && typeof CertCal_garantirColuna_ === 'function') CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, 'SERIE_A_CONFIRMAR'); } catch (eC) {}
  try {
    var reg = SGO_DATA.insert(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, { CLIENTE_ID: Com_s_(p.CLIENTE_ID), UNIDADE_ID: Com_s_(p.UNIDADE_ID), TIPO: Com_s_(e.tipo), FABRICANTE: Com_s_(e.marca), MODELO: Com_s_(e.modelo), SERIE: Com_s_(e.serie),
      CAPACIDADE: Com_s_(e.capacidade), SETOR: Com_s_(e.setor), TAG: '', STATUS: 'ATIVO', ORIGEM: 'COMERCIAL', SERIE_A_CONFIRMAR: serie ? '' : 'SIM', OBS: 'Cadastrado pela proposta ' + ComP_rotulo_(p) + ' (' + (e.origem === 'CLIENTE' ? 'dados do cliente conferidos por ' : 'informado por ') + Com_s_(eu.nome) + ').' });
    return Com_s_(reg.ID);
  } catch (x) { return ''; }
}

// ------------------------------------------------------------
// GESTORA (lista do dia do vendedor)
// ------------------------------------------------------------
function ComDE_itensVendedor_(props) {
  var out = [], hoje = Com_hoje_();
  (props || []).forEach(function (p) {
    var sit = Com_s_(p.DADOS_SITUACAO);
    if (!sit || ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) return;
    var pd = Com_json_(p.DADOS_PEDIDO_JSON, null);
    if (!pd) return;
    var ref = { tipo: 'proposta', id: Com_s_(p.ID) }, base = ComP_rotulo_(p) + ' · ' + Com_s_(p.CLIENTE_NOME), valor = Number(p.TOTAL) || 0;
    if (sit === 'RESPONDIDO') out.push({ chave: 'DADOS_CONFERIR:' + p.ID, regra: 'DADOS_CONFERIR', prioridade: 1, titulo: base + ': o cliente enviou os dados', ref: ref, valor: valor,
      porque: 'Os dados enviados pelo cliente só entram no cadastro depois da sua conferência, e a proposta só é emitida com os dados completos.', acao: 'Abra a proposta e toque em "Conferir os dados do cliente".' });
    else if (sit === 'AGUARDANDO_CLIENTE') {
      var du = Com_diasUteisEntre_(Com_dia_(pd.em), hoje);
      if (du >= 2) out.push({ chave: 'DADOS_AGUARDANDO:' + p.ID, regra: 'DADOS_AGUARDANDO', prioridade: 2, titulo: base + ': aguardando os dados do cliente há ' + du + ' dias úteis', ref: ref, valor: valor,
        porque: 'Sem os dados completos a proposta não é emitida; cada dia parado é proposta que não chega ao cliente.', acao: 'Ligue para o contato e lembre do link (o texto está na proposta, "Copiar texto"); se o link venceu, gere um novo pedido.',
        mensagem: 'Olá! Passando para lembrar dos dados da proposta ' + ComP_rotulo_(p) + ': com eles emitimos a proposta no mesmo dia. O link é o mesmo da mensagem anterior. Obrigado!' });
    }
  });
  return out;
}

// ------------------------------------------------------------
// ESCOPO ESCRITO PELA ESPECIALISTA, LIDO E VALIDADO PELO VENDEDOR (11/11/2026)
// ------------------------------------------------------------
/**
 * Pedido do dono (11/11/2026): "ele preenche, e um especialista I.A preenche impecavelmente e o vendedor só lê e valida".
 *  - Gerar (só no rascunho, com os equipamentos e o local já identificados): a especialista escreve o escopo técnico a partir da
 *    descrição do catálogo, dos parâmetros técnicos do item (detalhe), dos equipamentos e das condições da proposta. Com a chave da
 *    IA: texto da IA conferido (números só os dos fatos; norma só as que o catálogo e a metodologia já citam; nada de "IA", emoji ou
 *    promessa de preço); reprovado ou sem chave: modelo determinístico a partir dos mesmos fatos (nunca bloqueia).
 *  - Validar: o vendedor lê e toca "Li e valido o escopo" (quem, quando, a marca do texto e a marca do conteúdo). Mudou o texto, um
 *    item, a quantidade, um equipamento ou o local: a validação cai e a tela oferece gerar de novo.
 * ESCOPO_VALIDACAO_JSON: { gerado: { em, porNome, origem ('IA'|'MODELO'), marcaConteudo, marcaTexto, verificacao, versao }, validado: { em, porId, porNome, marcaConteudo, marcaTexto, versao } }
 */
var COM_DE_NORMA_RE = /\b(?:RDC|NBR(?:\s*ISO)?|ABNT\s*NBR(?:\s*ISO)?|ISO|IEC|NR|Portaria|Resolu[cç][aã]o)\s*(?:n[ºo°.]*\s*)?[\dA-Z][\w.\/:-]*(?:\s*\/\s*\d{2,4})?/gi;
function ComDE_normasDe_(texto) {
  var l = [], m;
  var re = new RegExp(COM_DE_NORMA_RE.source, 'gi');
  while ((m = re.exec(Com_s_(texto)))) { var n = Com_normBusca_(m[0]).replace(/\s+/g, ''); if (n && l.indexOf(n) < 0) l.push(n); }
  return l;
}
function ComDE_unidadeTxt_(p) {
  var un = Com_s_(p.UNIDADE_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(p.UNIDADE_ID)) || {} : {};
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  var cidade = Com_s_(un.CIDADE) || Com_s_(cli.CIDADE), uf = Com_up_(un.UF) || Com_up_(cli.UF);
  return { nome: Com_s_(un.NOME_UNIDADE) || Com_s_(cli.NOME_FANTASIA) || Com_s_(p.CLIENTE_NOME), local: cidade ? cidade + (uf ? '/' + uf : '') : '' };
}
/** Equipamentos do item em texto (identificação; a marca entra só como identificação do equipamento). */
function ComDE_equipTextos_(i, eqs) {
  var l = [];
  if (Com_s_(i.equipamentoId) && !(Array.isArray(i.equipamentos) && i.equipamentos.some(function (e) { return Com_s_(e.equipamentoId) === Com_s_(i.equipamentoId); }))) l.push({ equipamentoId: i.equipamentoId });
  (Array.isArray(i.equipamentos) ? i.equipamentos : []).forEach(function (e) { l.push(e); });
  return l.map(function (e) {
    var c = Com_s_(e.equipamentoId) ? eqs[Com_s_(e.equipamentoId)] || {} : null;
    var x = c ? { tipo: c.TIPO, marca: c.FABRICANTE, modelo: c.MODELO, serie: c.SERIE, capacidade: c.CAPACIDADE, setor: c.SETOR, tag: c.TAG } : e;
    return [Com_s_(x.tipo), Com_s_(x.marca), Com_s_(x.modelo) ? 'modelo ' + Com_s_(x.modelo) : '', Com_s_(x.serie) ? 'nº de série ' + Com_s_(x.serie) : '', Com_s_(x.capacidade) ? 'capacidade ' + Com_s_(x.capacidade) : '', Com_s_(x.tag) ? 'TAG ' + Com_s_(x.tag) : '', Com_s_(x.setor) ? 'setor ' + Com_s_(x.setor) : ''].filter(Boolean).join(', ');
  }).filter(Boolean);
}
/** Fatos da proposta para o escopo (o que a especialista pode usar; nada além disso). */
function ComDE_fatosEscopo_(p) {
  var itens = (Com_json_(p.ITENS_JSON, []) || []).filter(function (i) { return i && !i.auto; });
  var eqs = {};
  ComDE_lerSeguro_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { eqs[Com_s_(e.ID)] = e; });
  var pol = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null, prazo = Com_json_(p.PRAZO_JSON, null) || {};
  var polPz = pol && typeof ComPr_politicaDoPrazo_ === 'function' ? ComPr_politicaDoPrazo_(prazo, Com_metodologia_()) : pol;
  var fx = polPz && typeof ComPr_faixa_ === 'function' ? ComPr_faixa_(polPz, prazo.faixa || 'NORMAL') : null;
  var local = ComDE_unidadeTxt_(p);
  var f = { proposta: ComP_rotulo_(p), cliente: Com_s_(p.CLIENTE_NOME), unidade: local.nome, local: local.local,
    relatorioDiasUteis: polPz && polPz.prazo ? Number(polPz.prazo.relatorioDiasUteis) || 5 : 5, contaAte: polPz && polPz.prazo ? polPz.prazo.contaAte : 'RELATORIO',
    prazoNome: fx ? Com_s_(fx.nome) : '', prazoDias: fx ? Number(fx.diasUteis) || null : null,
    itens: itens.map(function (i) {
      var c = i.catalogo || {};
      return { ordem: Number(i.ordem) || 0, tipo: Com_up_(i.tipo) || 'SERVICO', descricao: Com_s_(i.descricao), quantidade: Number(i.quantidade) || 0, unidade: Com_s_(i.unidade),
        catalogo: Com_s_(c.nome), descricaoCatalogo: Com_texto_(c.descricaoBase, 1200), detalhe: Com_texto_(i.detalhe, 1200), equipamentos: ComDE_equipTextos_(i, eqs), tecnico: ComDE_exigeEquipamento_(i),
        servicoPedido: ComDE_servicoTexto_(i.servico) };
    }) };
  var fonteNormas = f.itens.map(function (i) { return i.descricaoCatalogo + ' ' + i.detalhe; }).join(' ');
  try { var met = Com_metodologia_(); fonteNormas += ' ' + JSON.stringify((met.proposta || {}).condicoes || {}) + ' ' + Com_s_((met.proposta || {}).responsabilidades); } catch (e) {}
  f.normasPermitidas = ComDE_normasDe_(fonteNormas);
  f.normasTexto = (Com_s_(fonteNormas).match(new RegExp(COM_DE_NORMA_RE.source, 'gi')) || []).filter(function (x, k, a) { return a.indexOf(x) === k; }).slice(0, 20);
  return f;
}
/** 11/11/2026 (proposta guiada): o serviço pedido em texto ("Qualificação de desempenho (QD); ciclos: 134 °C; com e sem carga"). */
function ComDE_servicoTexto_(sv) {
  if (!sv) return '';
  var nomes = typeof COM_AS_SERVICOS !== 'undefined' ? COM_AS_SERVICOS : {}, cargas = typeof COM_AS_CARGAS !== 'undefined' ? COM_AS_CARGAS : {};
  return [nomes[Com_up_(sv.tipo)] || '', (sv.ciclos || []).length ? 'ciclos ou programas: ' + sv.ciclos.join(', ') : '', Com_up_(sv.carga) && Com_up_(sv.carga) !== 'NSA' ? (cargas[Com_up_(sv.carga)] || '').toLowerCase() : ''].filter(Boolean).join('; ');
}
/** Marca do conteúdo que o escopo descreve: itens (o quê, quanto, equipamentos e parâmetros) e o local. */
function ComDE_marcaConteudo_(p) {
  var f = ComDE_fatosEscopo_(p);
  return Com_marca_(JSON.stringify([f.local, f.itens.map(function (i) { return [i.ordem, i.descricao, i.quantidade, i.unidade, i.detalhe, i.equipamentos].concat(i.servicoPedido ? [i.servicoPedido] : []); })]));
}
function ComDE_marcaTexto_(t) { return Com_marca_(Com_s_(t).replace(/\s+/g, ' ').trim()); }
/** { valido, motivo, validacao, gerado } */
function ComDE_escopoValidado_(p) {
  var v = Com_json_(p.ESCOPO_VALIDACAO_JSON, null) || {}, val = v.validado || null;
  var escopo = typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO);
  if (!val) return { valido: false, motivo: 'O escopo da proposta ainda não foi lido e validado pelo vendedor', gerado: v.gerado || null, validacao: null };
  if (val.marcaTexto !== ComDE_marcaTexto_(escopo)) return { valido: false, motivo: 'O texto do escopo mudou depois da validação de ' + Com_s_(val.porNome) + ' (' + Com_br_(val.em) + '): valide de novo', gerado: v.gerado || null, validacao: val, mudou: 'TEXTO' };
  if (val.marcaConteudo !== ComDE_marcaConteudo_(p)) return { valido: false, motivo: 'Os itens, os equipamentos ou o local mudaram depois da validação de ' + Com_s_(val.porNome) + ' (' + Com_br_(val.em) + '): gere o escopo de novo e valide', gerado: v.gerado || null, validacao: val, mudou: 'CONTEUDO' };
  return { valido: true, motivo: '', gerado: v.gerado || null, validacao: val };
}

/** Modelo determinístico (sem IA): só os fatos, em texto corrido profissional. */
function ComDE_escopoModelo_(f) {
  var NL = String.fromCharCode(10), partes = [];
  var tec = f.itens.filter(function (i) { return i.tipo !== 'PRODUTO'; }), prod = f.itens.filter(function (i) { return i.tipo === 'PRODUTO'; });
  partes.push('Prestação de serviços técnicos ' + (f.unidade ? 'para ' + f.unidade : 'ao cliente') + (f.local ? ', em ' + f.local : '') + ', conforme descrito abaixo e nos itens desta proposta.');
  tec.forEach(function (i) {
    var q = i.equipamentos.length || i.quantidade;
    var cab = i.descricao + (i.tecnico && q ? ' (' + Com_plural_(q, 'equipamento', 'equipamentos') + ')' : '') + ': ';
    var corpo = Com_s_(i.detalhe) || Com_s_(i.descricaoCatalogo) || 'execução do serviço descrito no item, com o registro dos resultados.';
    if (!/[.!?]$/.test(corpo)) corpo += '.';
    var eq = i.equipamentos.length ? ' Equipamento' + (i.equipamentos.length > 1 ? 's' : '') + ': ' + i.equipamentos.map(function (e, k) { return (i.equipamentos.length > 1 ? (k + 1) + ') ' : '') + e; }).join('; ') + '.' : '';
    var svT = i.servicoPedido ? ' Serviço contratado: ' + i.servicoPedido + '.' : '';
    partes.push(cab + corpo + svT + eq);
  });
  if (prod.length) partes.push('Fornecimento: ' + prod.map(function (i) { return i.descricao + ' (' + String(i.quantidade).replace('.', ',') + ' ' + (i.unidade || 'un.') + ')'; }).join('; ') + '.');
  if (tec.length) partes.push('Entrega: relatório técnico ou certificado de cada equipamento em até ' + Com_plural_(f.relatorioDiasUteis, 'dia útil', 'dias úteis') + ' após a execução, emitido pela Metrolabs e assinado pelo responsável técnico' + (f.prazoDias ? '; prazo ' + Com_s_(f.prazoNome).toLowerCase() + ' de ' + Com_plural_(f.prazoDias, 'dia útil', 'dias úteis') + (f.contaAte === 'EXECUCAO' ? ' para a execução' : ' até a entrega do relatório ou certificado') + ', contado do aceite da proposta e da liberação do equipamento' : '') + '.');
  partes.push('Não estão incluídos serviços, peças, reparos ou ajustes que não estejam descritos acima; se forem necessários durante a execução, são informados ao cliente e orçados à parte.');
  return partes.join(NL + NL);
}

/** Confere o texto da especialista: normas só as permitidas, números só os dos fatos, sem IA, sem preço, tamanho razoável. */
function ComDE_verificarEscopo_(texto, f) {
  var t = Com_s_(texto), probs = [];
  if (t.length < 200) probs.push('texto curto demais');
  if (t.length > 7500) probs.push('texto longo demais');
  ComDE_normasDe_(t).forEach(function (n) { if (f.normasPermitidas.indexOf(n) < 0) probs.push('norma não citada no catálogo: ' + n); });
  if (/R\$\s*\d/.test(t)) probs.push('valor em reais (o escopo não traz preço)');
  if (/\b(IA|I\.A\.|intelig[eê]ncia artificial|ChatGPT|Gemini)\b/i.test(t)) probs.push('referência a IA');
  if (/\*\*|^#|^\s*[-*]\s/m.test(t)) probs.push('formatação de lista ou destaque');
  if (/garantimos|o melhor do mercado|l[ií]der|imbat[ií]vel|gr[aá]tis/i.test(t)) probs.push('promessa comercial');
  // números: só os dos fatos (quantidades, dias, capacidades, séries, normas, ciclos, temperaturas do catálogo)
  var fontes = JSON.stringify(f);
  (t.match(/\d+(?:[.,]\d+)?/g) || []).forEach(function (n) { var x = n.replace(',', '.'); if (Number(x) > 10 && fontes.indexOf(n) < 0 && fontes.indexOf(x) < 0) probs.push('número fora dos fatos: ' + n); });
  if (typeof ComG_verificar_ === 'function') { var g = ComG_verificar_(t, f, { livres: 10 }); (g.problemas || []).forEach(function (x) { if (!/número|numero/i.test(x)) probs.push(x); }); }
  return { ok: !probs.length, problemas: probs.filter(function (x, k, a) { return a.indexOf(x) === k; }).slice(0, 12) };
}

function ComDE_promptEscopo_(f) {
  return 'Você é a especialista técnica da Metrolabs (engenharia clínica e metrologia: qualificação térmica, calibração rastreável, manutenção e inspeção de equipamentos hospitalares). ' +
    'Escreva o ESCOPO TÉCNICO da proposta comercial ' + f.proposta + ' em português do Brasil, tom profissional e direto, texto corrido em parágrafos (sem listas com marcadores, sem negrito, sem títulos com #, sem emoji), como um engenheiro escreveria para o cliente hospitalar.\n' +
    'Use SOMENTE os fatos do JSON abaixo. Regras obrigatórias:\n' +
    '1. Um parágrafo de abertura (o que é contratado, para quem e onde).\n2. Um parágrafo por serviço: o que é feito em cada equipamento (use o que está em "descricaoCatalogo", "detalhe" e "servicoPedido": etapas como QI, QO, QD, calibração, ensaios, os ciclos ou programas contratados, condições com ou sem carga, pontos), e a identificação de cada equipamento como está em "equipamentos" (a marca aparece só como identificação do equipamento, nunca como recomendação).\n' +
    '3. Normas: cite apenas as que estão em "normasTexto" e só quando o serviço do item as usar. Se a lista estiver vazia, não cite norma nenhuma.\n' +
    '4. Números: use apenas números presentes nos fatos (quantidades, dias, capacidades, temperaturas, ciclos, séries). Não invente número, prazo, temperatura ou ciclo.\n' +
    '5. Um parágrafo de entrega: relatório técnico ou certificado de cada equipamento em até ' + f.relatorioDiasUteis + ' dias úteis após a execução, emitido pela Metrolabs e assinado pelo responsável técnico.\n' +
    '6. Um parágrafo final do que NÃO está incluso: serviços, peças, reparos ou ajustes não descritos, que são informados e orçados à parte. Não fale de preço, desconto nem forma de pagamento.\n' +
    '7. Não mencione inteligência artificial, sistema ou que o texto foi gerado.\n' +
    'Responda só com JSON: {"escopo": "texto com parágrafos separados por \\n\\n"}\n\nFATOS:\n' + JSON.stringify(f);
}

/** Gera o escopo (rascunho). d: { id, substituir (true quando já há texto escrito) } */
function ComDE_gerarEscopo_(eu, d) {
  d = d || {};
  var p = ComDE_obter_(eu, d.id, 'gerar o escopo');
  if (Com_up_(p.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível gerar o escopo: a proposta ' + ComP_rotulo_(p) + ' está "' + (COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || p.SITUACAO) + '". O escopo é escrito no rascunho: toque em "Editar (volta para rascunho)", gere e conclua de novo');
  var antes = ComDE_faltas_(p).filter(function (f) { return f.grupo === 'EQUIPAMENTO' || f.id === 'UN.LOCAL' || /^ESC\.ITEM/.test(f.id); });
  if (antes.length) throw new Error('Não foi possível gerar o escopo ainda: a especialista escreve a partir dos equipamentos identificados e do local, e falta: ' + antes.slice(0, 6).map(function (f) { return f.oQue; }).join('; ') +
    '. O que fazer: identifique os equipamentos (ou peça ao cliente) e complete o local; depois toque em "Gerar o escopo com a especialista" de novo');
  var atualTxt = typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO);
  if (Com_s_(atualTxt) && !ComDE_generico_(atualTxt, 60) && d.substituir !== true) throw new Error('A proposta já tem um escopo escrito. Para trocar pelo texto da especialista, confirme "Substituir o escopo atual" e toque em gerar de novo (o texto atual fica no histórico)');
  var f = ComDE_fatosEscopo_(p), texto = '', origem = 'MODELO', verif = '', aviso = '';
  var ia = typeof ComG_chamarIA_ === 'function' ? ComG_chamarIA_(ComDE_promptEscopo_(f), 16384) : { json: null, aviso: 'sem a especialista de IA neste servidor' };
  if (ia.json && Com_s_(ia.json.escopo)) {
    var cand = Com_texto_(ia.json.escopo, 7800).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    var v = ComDE_verificarEscopo_(cand, f);
    if (v.ok) { texto = cand; origem = 'IA'; verif = 'Conferido: normas, números e termos dentro dos fatos.'; }
    else { aviso = 'O texto da especialista não passou na conferência (' + v.problemas.slice(0, 4).join('; ') + '); veio o modelo a partir do catálogo.'; verif = 'Reprovado: ' + v.problemas.join('; '); }
  } else aviso = ia.aviso ? ia.aviso.replace('A gestora está trabalhando só pelas regras: ', '') + ' O escopo veio do modelo a partir do catálogo.' : '';
  if (!texto) texto = ComDE_escopoModelo_(f);
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var at = ComP_obter_(eu, p.ID, 'gerar o escopo');
    if (Com_up_(at.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível gravar o escopo: a proposta saiu do rascunho enquanto o texto era escrito. Atualize a tela');
    var agora = Com_agora_(), reg = Com_json_(at.ESCOPO_VALIDACAO_JSON, {}) || {};
    var versao = (Number(reg.gerado && reg.gerado.versao) || 0) + 1;
    reg.gerado = { em: agora, porId: eu.id, porNome: eu.nome, origem: origem, marcaConteudo: ComDE_marcaConteudo_(at), marcaTexto: ComDE_marcaTexto_(texto), verificacao: verif, versao: versao };
    reg.validado = null;
    SGO_DATA.update(COM_ABAS.PROPOSTAS, at.ID, { ESCOPO: texto, ESCOPO_VALIDACAO_JSON: JSON.stringify(reg), ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', at.ID, 'ESCOPO_GERADO', eu, { texto: 'Escopo escrito pela especialista (versão ' + versao + ', ' + (origem === 'IA' ? 'texto da IA conferido' : 'modelo a partir do catálogo') + ').' + (Com_s_(atualTxt) ? ' Texto anterior: ' + Com_texto_(atualTxt, 1500) : '') });
    return { proposta: ComP_detalhe_(eu, at.ID), escopo: texto, origem: origem, aviso: aviso,
      message: 'Escopo escrito pela especialista (' + (origem === 'IA' ? 'conferido' : 'modelo a partir do catálogo') + '). Leia, ajuste se precisar e toque em "Li e valido o escopo": sem a validação a proposta não é emitida.' + (aviso ? ' ' + aviso : '') };
  });
}

/** O vendedor leu e valida o texto que está na proposta. d: { id, texto (o que ele leu), li: true } */
function ComDE_validarEscopo_(eu, d) {
  d = d || {};
  if (d.li !== true) throw new Error('Não foi possível validar: marque "Li o escopo inteiro e ele descreve o que será feito". A validação registra quem leu e quando');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var p = ComDE_obter_(eu, d.id, 'validar o escopo');
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) < 0) throw new Error('Não foi possível validar: a proposta ' + ComP_rotulo_(p) + ' já saiu para o cliente. Para mudar o escopo, faça nova revisão');
    var escopo = typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO);
    if (!Com_s_(escopo) || ComDE_generico_(escopo, 60)) throw new Error('Não foi possível validar: o escopo está em branco ou genérico. Gere com a especialista ou escreva o que será feito, salve e valide');
    if (ComDE_marcaTexto_(d.texto) !== ComDE_marcaTexto_(escopo)) throw new Error('Não foi possível validar: o texto que você leu não é o que está gravado (alguém mudou ou faltou salvar). Atualize a tela, leia de novo e valide');
    var agora = Com_agora_(), reg = Com_json_(p.ESCOPO_VALIDACAO_JSON, {}) || {};
    var versao = (Number(reg.validado && reg.validado.versao) || Number(reg.gerado && reg.gerado.versao) || 0) + (reg.gerado && reg.gerado.marcaTexto === ComDE_marcaTexto_(escopo) ? 0 : 1);
    reg.validado = { em: agora, porId: eu.id, porNome: eu.nome, marcaConteudo: ComDE_marcaConteudo_(p), marcaTexto: ComDE_marcaTexto_(escopo), versao: versao || 1,
      ajustado: !!(reg.gerado && reg.gerado.marcaTexto !== ComDE_marcaTexto_(escopo)) };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { ESCOPO_VALIDACAO_JSON: JSON.stringify(reg), ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'ESCOPO_VALIDADO', eu, { texto: eu.nome + ' leu e validou o escopo (versão ' + reg.validado.versao + (reg.validado.ajustado ? ', com ajustes do vendedor sobre o texto da especialista' : reg.gerado ? ', texto da especialista' : ', texto do vendedor') + '; marca ' + reg.validado.marcaTexto.slice(0, 12) + ').' });
    return { proposta: ComP_detalhe_(eu, p.ID), message: 'Escopo validado por ' + eu.nome + '. Se mudar item, equipamento ou o texto, a validação cai e é preciso validar de novo.' };
  });
}

/** Resumo do escopo para a tela. */
function ComDE_escopoTela_(p) {
  var e = ComDE_escopoValidado_(p), g = e.gerado;
  var escopo = typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO);
  return { texto: escopo, valido: e.valido, motivo: e.motivo, mudou: e.mudou || '', gerado: g ? { em: Com_br_(g.em), por: Com_s_(g.porNome), origem: g.origem, origemNome: g.origem === 'IA' ? 'especialista (texto conferido)' : 'modelo a partir do catálogo', versao: g.versao, editado: g.marcaTexto !== ComDE_marcaTexto_(escopo) } : null,
    validado: e.validacao ? { em: Com_br_(e.validacao.em), por: Com_s_(e.validacao.porNome), versao: e.validacao.versao } : null, exige: (Com_json_(p.ITENS_JSON, []) || []).some(function (i) { return i && !i.auto && Com_up_(i.tipo) !== 'PRODUTO'; }) };
}
